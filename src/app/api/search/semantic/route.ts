import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/openai'
import { detectSimilarityQuery } from '@/lib/search/similarity-detection'
import { NextRequest, NextResponse } from 'next/server'
import type { Book } from '@/types/database'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const body = await request.json()
  const { query, limit = 20 } = body

  if (!query) {
    return NextResponse.json({ error: 'Search query required' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Semantic search not configured' }, { status: 503 })
  }

  try {
    // Check if this is a "similar to X" query
    const similarityCheck = detectSimilarityQuery(query)

    if (similarityCheck.isSimilarityQuery && similarityCheck.sourceBookTitle) {
      // Find the source book first
      const { data: sourceBooks } = await supabase
        .from('books')
        .select('id, title')
        .neq('status', 'inactive')
        .ilike('title', `%${similarityCheck.sourceBookTitle}%`)
        .limit(1)

      if (sourceBooks && sourceBooks.length > 0) {
        const sourceBook = sourceBooks[0]

        // Use find_similar_books RPC to get similar books (excludes source automatically)
        const { data: similarBooks, error: rpcError } = await supabase.rpc('find_similar_books', {
          book_id: sourceBook.id,
          match_count: limit,
        })

        if (!rpcError && similarBooks?.length > 0) {
          return NextResponse.json({
            books: similarBooks as Book[],
            query,
            search_type: 'similar',
            source_book: sourceBook.title,
            counts: {
              similar: similarBooks.length,
              total: similarBooks.length,
            },
          })
        }

        // Fallback: genre-based similarity if RPC fails
        const { data: fullSourceBook } = await supabase
          .from('books')
          .select('genres')
          .eq('id', sourceBook.id)
          .single()

        if (fullSourceBook?.genres?.length) {
          const { data: genreBooks } = await supabase
            .from('books')
            .select('*')
            .neq('id', sourceBook.id)
            .neq('status', 'inactive')
            .overlaps('genres', fullSourceBook.genres)
            .limit(limit)

          if (genreBooks?.length) {
            return NextResponse.json({
              books: genreBooks,
              query,
              search_type: 'similar_genre',
              source_book: sourceBook.title,
              counts: {
                genre: genreBooks.length,
                total: genreBooks.length,
              },
            })
          }
        }
      }
      // If source book not found, fall through to regular search
    }

    // Detect query type to determine search strategy
    // Short queries (1-2 words) are likely title/author lookups
    // Longer queries or natural language are likely conceptual/discovery
    const words = query.trim().split(/\s+/).filter((w: string) => w.length > 1)
    const isLikelyTitleSearch = words.length <= 3 && !query.toLowerCase().includes('about') &&
                                 !query.toLowerCase().includes('like') && !query.toLowerCase().includes('similar')

    // Capitalize first letter for genre matching
    const genreQuery = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase()

    // Run both searches in parallel
    const [semanticResults, textResults] = await Promise.all([
      // Semantic search using embeddings
      (async () => {
        try {
          const queryEmbedding = await generateEmbedding(query)
          const { data, error } = await supabase.rpc('match_books', {
            query_embedding: queryEmbedding,
            match_threshold: 0.15,
            match_count: limit
          })
          if (error) {
            console.warn('Semantic search error:', error.message)
            return []
          }
          return (data || []) as Book[]
        } catch (e) {
          console.warn('Semantic search failed:', e)
          return []
        }
      })(),
      // Text search: title, author, description, and genre matching
      (async () => {
        // Build OR conditions - search full query and individual words
        let orConditions = `title.ilike.%${query}%,author.ilike.%${query}%,description.ilike.%${query}%,genres.cs.{"${genreQuery}"}`

        // Add individual word matches for multi-word queries
        if (words.length > 1) {
          for (const word of words) {
            if (word.length > 2) {
              orConditions += `,title.ilike.%${word}%,author.ilike.%${word}%`
            }
          }
        }

        const { data, error } = await supabase
          .from('books')
          .select('*')
          .neq('status', 'inactive')
          .or(orConditions)
          .limit(limit)

        if (error) {
          console.warn('Text search error:', error.message)
          return []
        }
        return (data || []) as Book[]
      })()
    ])

    // Score and merge results with smart ranking
    // Key insight: For title searches, exact text matches should rank higher
    // For discovery queries, semantic matches should rank higher
    interface ScoredBook extends Book {
      _score: number
      _matchType: 'exact_title' | 'partial_title' | 'author' | 'semantic' | 'other'
    }

    const scoredBooks = new Map<string, ScoredBook>()
    const queryLower = query.toLowerCase()

    // Score text results
    for (const book of textResults) {
      const titleLower = book.title.toLowerCase()
      const authorLower = book.author.toLowerCase()

      let score = 0
      let matchType: ScoredBook['_matchType'] = 'other'

      // Exact title match (highest priority)
      if (titleLower === queryLower) {
        score = 1000
        matchType = 'exact_title'
      }
      // Title contains full query
      else if (titleLower.includes(queryLower)) {
        score = 500
        matchType = 'partial_title'
      }
      // Title starts with query
      else if (titleLower.startsWith(queryLower)) {
        score = 400
        matchType = 'partial_title'
      }
      // Author match
      else if (authorLower.includes(queryLower)) {
        score = 300
        matchType = 'author'
      }
      // Individual word matches in title (for multi-word queries)
      else {
        const matchedWords = words.filter((w: string) => titleLower.includes(w.toLowerCase()))
        score = 100 + (matchedWords.length * 50)
        matchType = matchedWords.length > 0 ? 'partial_title' : 'other'
      }

      scoredBooks.set(book.id, { ...book, _score: score, _matchType: matchType })
    }

    // Score semantic results (add to existing or create new entries)
    for (const book of semanticResults) {
      const existing = scoredBooks.get(book.id)
      // Semantic base score - lower for likely title searches, higher for discovery
      const semanticBonus = isLikelyTitleSearch ? 50 : 200

      if (existing) {
        // Book found by both - boost the score
        existing._score += semanticBonus
      } else {
        scoredBooks.set(book.id, {
          ...book,
          _score: semanticBonus,
          _matchType: 'semantic'
        })
      }
    }

    // Sort by score (highest first) and extract books
    const sortedBooks = Array.from(scoredBooks.values())
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)

    // Determine search type for display
    const hasTextMatches = textResults.length > 0
    const hasSemanticMatches = semanticResults.length > 0

    let searchType: string
    if (hasTextMatches && hasSemanticMatches) {
      searchType = 'hybrid'
    } else if (hasSemanticMatches) {
      searchType = 'semantic'
    } else {
      searchType = 'text_fallback'
    }

    // Remove internal scoring fields before returning
    const cleanBooks = sortedBooks.map(({ _score, _matchType, ...book }) => book)

    return NextResponse.json({
      books: cleanBooks,
      query,
      search_type: searchType,
      counts: {
        semantic: semanticResults.length,
        text: textResults.length,
        total: cleanBooks.length
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
