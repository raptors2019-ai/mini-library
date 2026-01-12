import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface BookData {
  id: string
  title: string
  cover_url: string | null
  author: string
  embedding: number[] | null
}

interface RatedBookEntry {
  book_id: string
  rating: number | null
  book: BookData | BookData[] | null
}

interface SourceBook {
  id: string
  title: string
  cover_url: string | null
  author: string
}

interface SimilarBook extends SourceBook {
  status: string
  genres: string[] | null
  ai_summary: string | null
  similarity?: number
}

interface RecommendationGroup {
  sourceBook: SourceBook
  similarBooks: SimilarBook[]
}

function extractBook(bookData: BookData | BookData[] | null): BookData | null {
  if (!bookData) return null
  if (Array.isArray(bookData)) return bookData[0] || null
  return bookData
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '6')

  // Get user's highly-rated books (4+ stars) with embeddings
  const { data: ratedBooks, error: ratedError } = await supabase
    .from('user_books')
    .select('book_id, rating, book:books(id, title, cover_url, author, embedding)')
    .eq('user_id', user.id)
    .gte('rating', 4)
    .eq('status', 'read')
    .order('rating', { ascending: false })
    .limit(5)

  if (ratedError || !ratedBooks || ratedBooks.length === 0) {
    return NextResponse.json({ recommendations: [] })
  }

  // Get all books user has interacted with
  const { data: userBooks } = await supabase
    .from('user_books')
    .select('book_id')
    .eq('user_id', user.id)

  const userBookIds = userBooks?.map(ub => ub.book_id) || []

  // For each highly-rated book, find similar books
  const recommendations: RecommendationGroup[] = []
  const typedRatedBooks = ratedBooks as RatedBookEntry[]

  for (const ratedBook of typedRatedBooks) {
    const book = extractBook(ratedBook.book)

    if (!book || !book.embedding) continue

    // Use RPC to find similar books
    const { data: similarBooks, error: similarError } = await supabase.rpc('find_similar_books', {
      book_id: book.id,
      match_count: limit + userBookIds.length
    })

    if (similarError) {
      // Fallback to genre-based
      const { data: sourceBook } = await supabase
        .from('books')
        .select('genres')
        .eq('id', book.id)
        .single()

      if (sourceBook?.genres?.length) {
        let genreQuery = supabase
          .from('books')
          .select('id, title, cover_url, author, status, genres, ai_summary')
          .neq('id', book.id)
          .neq('status', 'inactive')
          .overlaps('genres', sourceBook.genres)

        if (userBookIds.length > 0) {
          genreQuery = genreQuery.not('id', 'in', `(${userBookIds.join(',')})`)
        }

        const { data: genreBooks } = await genreQuery.limit(limit)

        if (genreBooks && genreBooks.length > 0) {
          recommendations.push({
            sourceBook: {
              id: book.id,
              title: book.title,
              cover_url: book.cover_url,
              author: book.author,
            },
            similarBooks: genreBooks,
          })
        }
      }
      continue
    }

    // Filter out books user has already read
    const filteredSimilar = (similarBooks || [])
      .filter((b: { id: string }) => !userBookIds.includes(b.id))
      .slice(0, limit)

    if (filteredSimilar.length > 0) {
      recommendations.push({
        sourceBook: {
          id: book.id,
          title: book.title,
          cover_url: book.cover_url,
          author: book.author,
        },
        similarBooks: filteredSimilar,
      })
    }

    // Stop after finding 2 source books with recommendations
    if (recommendations.length >= 2) break
  }

  return NextResponse.json({ recommendations })
}
