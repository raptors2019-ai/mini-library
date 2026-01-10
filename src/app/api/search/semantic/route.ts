import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/openai'
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
    // Run semantic search and text/genre search in parallel for comprehensive results
    const [semanticResults, textResults] = await Promise.all([
      // Semantic search using embeddings
      (async () => {
        try {
          const queryEmbedding = await generateEmbedding(query)
          const { data, error } = await supabase.rpc('match_books', {
            query_embedding: queryEmbedding,
            match_threshold: 0.25, // Lower threshold for more results
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
        // Capitalize first letter for genre matching
        const genreQuery = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase()

        const { data, error } = await supabase
          .from('books')
          .select('*')
          .neq('status', 'inactive')
          .or(`title.ilike.%${query}%,author.ilike.%${query}%,description.ilike.%${query}%,genres.cs.{"${genreQuery}"}`)
          .limit(limit)

        if (error) {
          console.warn('Text search error:', error.message)
          return []
        }
        return (data || []) as Book[]
      })()
    ])

    // Merge results: semantic first (higher relevance), then text matches
    // Dedupe by book ID
    const seenIds = new Set<string>()
    const mergedBooks: Book[] = []

    // Add semantic results first (they're ranked by similarity)
    for (const book of semanticResults) {
      if (!seenIds.has(book.id)) {
        seenIds.add(book.id)
        mergedBooks.push(book)
      }
    }

    // Add text/genre matches that weren't in semantic results
    for (const book of textResults) {
      if (!seenIds.has(book.id)) {
        seenIds.add(book.id)
        mergedBooks.push(book)
      }
    }

    // Determine search type for display
    const searchType = semanticResults.length > 0
      ? (textResults.length > semanticResults.length ? 'hybrid' : 'semantic')
      : 'text_fallback'

    return NextResponse.json({
      books: mergedBooks.slice(0, limit),
      query,
      search_type: searchType,
      counts: {
        semantic: semanticResults.length,
        text: textResults.length,
        total: mergedBooks.length
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
