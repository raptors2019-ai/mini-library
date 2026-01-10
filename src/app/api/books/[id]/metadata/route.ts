import { createClient } from '@/lib/supabase/server'
import { getBookMetadata } from '@/lib/google-books'
import { findHardcoverBook, getHardcoverReviews } from '@/lib/hardcover'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Get enriched metadata for a book from external APIs
 * - Hardcover: ratings, reviews, reader counts
 * - Google Books: preview link, publisher
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createClient()

  // Get the book's ISBN, title, and author from database
  const { data: book, error } = await supabase
    .from('books')
    .select('isbn, title, author')
    .eq('id', id)
    .single()

  if (error || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  // Fetch Google Books data if ISBN available
  const googleData = book.isbn ? await getBookMetadata(book.isbn) : null

  // Find on Hardcover (tries ISBN first, then title/author)
  const hardcoverData = await findHardcoverBook(book)

  // If we found the book on Hardcover, also fetch reviews
  let reviews = null
  if (hardcoverData?.slug) {
    reviews = await getHardcoverReviews(hardcoverData.slug, 5)
  }

  // Combine the best data from each source
  const metadata = {
    // Hardcover: ratings and community stats
    rating: hardcoverData?.rating ?? null,
    ratingsCount: hardcoverData?.ratingsCount ?? null,
    reviewsCount: hardcoverData?.reviewsCount ?? null,
    usersReadCount: hardcoverData?.usersReadCount ?? null,
    hardcoverUrl: hardcoverData?.hardcoverUrl ?? null,
    hardcoverSlug: hardcoverData?.slug ?? null,
    reviews: reviews && reviews.length > 0 ? reviews : null,

    // Google Books: preview and publisher
    previewLink: googleData?.previewLink ?? null,
    publisher: googleData?.publisher ?? null,
  }

  // Check if we got any useful data
  const hasData = metadata.rating || metadata.previewLink || metadata.publisher

  if (!hasData) {
    return NextResponse.json({
      metadata: null,
      reason: 'Not found on external services'
    })
  }

  return NextResponse.json({ metadata })
}
