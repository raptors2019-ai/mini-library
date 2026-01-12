import { NextRequest } from 'next/server'
import { requireAdmin, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'
import { generateBookSummary, generateGenres } from '@/lib/openai'
import { getBookCoverUrl } from '@/lib/google-books'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST - Enrich a book request with AI-generated content
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { supabase } = auth
  const { id } = await params

  // Get the request
  const { data: bookRequest, error: fetchError } = await supabase
    .from('book_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !bookRequest) {
    return jsonError('Request not found', 404)
  }

  if (bookRequest.status !== 'pending') {
    return jsonError('Can only enrich pending requests', 400)
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {}
    const enriched = {
      cover_url: false,
      ai_summary: false,
      genres: false,
    }

    // Fetch cover from Google Books if ISBN is available and no cover exists
    if (bookRequest.isbn && !bookRequest.cover_url) {
      const coverUrl = await getBookCoverUrl(bookRequest.isbn)
      if (coverUrl) {
        updates.cover_url = coverUrl
        enriched.cover_url = true
      }
    }

    // Generate AI summary if not present
    if (!bookRequest.ai_summary) {
      const summary = await generateBookSummary({
        title: bookRequest.title,
        author: bookRequest.author,
        description: bookRequest.description,
        genres: bookRequest.genres,
      })
      updates.ai_summary = summary
      enriched.ai_summary = true
    }

    // Generate genres if not present or empty
    if (!bookRequest.genres || bookRequest.genres.length === 0) {
      const genres = await generateGenres({
        title: bookRequest.title,
        author: bookRequest.author,
        description: bookRequest.description,
      })
      updates.genres = genres
      enriched.genres = true
    }

    // Mark as enriched
    updates.enriched_at = new Date().toISOString()

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('book_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return jsonError(updateError.message, 500)
    }

    return jsonSuccess({
      request: updatedRequest,
      enriched,
    })
  } catch (error) {
    console.error('AI enrichment error:', error)
    return jsonError('Failed to enrich request with AI', 500)
  }
}
