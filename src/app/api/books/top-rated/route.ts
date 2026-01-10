import { createClient } from '@/lib/supabase/server'
import { getBooksWithCovers } from '@/lib/google-books'
import { findHardcoverBook } from '@/lib/hardcover'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600 // Cache for 1 hour

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const limit = parseInt(searchParams.get('limit') || '10')

  // Get all active books - we'll search Hardcover by ISBN or title/author
  const { data: books, error } = await supabase
    .from('books')
    .select('id, isbn, title, author, status, cover_url, genres')
    .neq('status', 'inactive')
    .limit(30) // Fetch more to allow for sorting after getting Hardcover data

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!books || books.length === 0) {
    return NextResponse.json({ books: [] })
  }

  // Fetch Hardcover ratings for each book (with parallelization)
  const booksWithRatings = await Promise.all(
    books.map(async (book) => {
      try {
        const hardcoverData = await findHardcoverBook(book)
        return {
          ...book,
          hardcover_rating: hardcoverData?.rating || null,
          hardcover_ratings_count: hardcoverData?.ratingsCount || 0
        }
      } catch {
        return { ...book, hardcover_rating: null, hardcover_ratings_count: 0 }
      }
    })
  )

  // Filter books that have Hardcover ratings and sort by rating
  const ratedBooks = booksWithRatings
    .filter(book => book.hardcover_rating !== null && book.hardcover_rating > 0)
    .sort((a, b) => {
      // Sort by rating first, then by number of ratings
      if ((b.hardcover_rating || 0) !== (a.hardcover_rating || 0)) {
        return (b.hardcover_rating || 0) - (a.hardcover_rating || 0)
      }
      return (b.hardcover_ratings_count || 0) - (a.hardcover_ratings_count || 0)
    })
    .slice(0, limit)

  if (ratedBooks.length === 0) {
    return NextResponse.json({ books: [] })
  }

  // Fetch cover URLs from Google Books for books missing covers
  const coverMap = await getBooksWithCovers(ratedBooks)

  // Add cover URLs and rating info to books
  const booksWithCovers = ratedBooks.map(book => ({
    id: book.id,
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    status: book.status,
    cover_url: coverMap.get(book.id) || book.cover_url || null,
    genres: book.genres,
    average_rating: book.hardcover_rating,
    rating_count: book.hardcover_ratings_count
  }))

  return NextResponse.json({ books: booksWithCovers })
}
