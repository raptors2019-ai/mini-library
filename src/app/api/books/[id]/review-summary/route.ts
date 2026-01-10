import { createClient } from '@/lib/supabase/server'
import { getHardcoverBookData, getHardcoverBookByTitleAuthor, getHardcoverReviews } from '@/lib/hardcover'
import { generateReviewSummary } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Get or generate an AI summary of reader reviews for a book
 * - Returns cached summary if available
 * - Otherwise fetches reviews from Hardcover and generates summary via OpenAI
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createClient()

  // Get the book with ISBN, title, author, and any existing summary
  const { data: book, error } = await supabase
    .from('books')
    .select('isbn, title, author, review_summary, review_summary_generated_at')
    .eq('id', id)
    .single()

  if (error || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  // Return cached summary if it exists
  if (book.review_summary) {
    return NextResponse.json({
      summary: book.review_summary,
      generatedAt: book.review_summary_generated_at,
      cached: true,
    })
  }

  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      summary: null,
      reason: 'AI summarization not configured',
    })
  }

  // Try to find on Hardcover - first by ISBN, then by title/author
  let hardcoverData = book.isbn ? await getHardcoverBookData(book.isbn) : null

  // Fallback to title/author search if ISBN search failed
  if (!hardcoverData && book.title && book.author) {
    hardcoverData = await getHardcoverBookByTitleAuthor(book.title, book.author)
  }

  if (!hardcoverData?.slug) {
    return NextResponse.json({
      summary: null,
      reason: 'Book not found on Hardcover',
    })
  }

  // Fetch reviews from Hardcover (get more for better summary)
  const reviews = await getHardcoverReviews(hardcoverData.slug, 10)

  if (!reviews || reviews.length === 0) {
    return NextResponse.json({
      summary: null,
      reason: 'No reviews available to summarize',
    })
  }

  try {
    // Generate summary using OpenAI
    const summary = await generateReviewSummary(
      book.title,
      reviews.map((r) => ({ review: r.review, rating: r.rating }))
    )

    if (!summary) {
      return NextResponse.json({
        summary: null,
        reason: 'Failed to generate summary',
      })
    }

    // Cache the summary in the database
    const generatedAt = new Date().toISOString()
    await supabase
      .from('books')
      .update({
        review_summary: summary,
        review_summary_generated_at: generatedAt,
      })
      .eq('id', id)

    return NextResponse.json({
      summary,
      generatedAt,
      cached: false,
    })
  } catch (err) {
    console.error('Failed to generate review summary:', err)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
