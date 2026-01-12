import { NextRequest } from 'next/server'
import { requireAdmin, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { generateEmbedding, createEmbeddingText, generateBookSummary, generateGenres } from '@/lib/openai'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST - Approve a book request
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const { id } = await params
  const body = await request.json()
  const { createBook = true } = body // Option to auto-create book from request data

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
    return jsonError('Request already processed', 400)
  }

  let bookId: string | null = null

  // Auto-create book from request data if requested
  if (createBook) {
    // Auto-enrich with AI if not already enriched
    let aiSummary = bookRequest.ai_summary
    let genres = bookRequest.genres || []

    // Generate AI summary if not present
    if (!aiSummary) {
      try {
        aiSummary = await generateBookSummary({
          title: bookRequest.title,
          author: bookRequest.author,
          description: bookRequest.description,
          genres: bookRequest.genres,
        })
      } catch (error) {
        console.error('Failed to generate AI summary:', error)
        // Continue without summary
      }
    }

    // Generate genres if not present
    if (!genres.length) {
      try {
        genres = await generateGenres({
          title: bookRequest.title,
          author: bookRequest.author,
          description: bookRequest.description,
        })
      } catch (error) {
        console.error('Failed to generate genres:', error)
        // Continue without genres
      }
    }

    // Generate embedding for semantic search
    let embedding: number[] | null = null
    try {
      const embeddingText = createEmbeddingText({
        title: bookRequest.title,
        author: bookRequest.author,
        description: bookRequest.description,
        ai_summary: aiSummary,
        genres: genres,
      })
      embedding = await generateEmbedding(embeddingText)
    } catch (error) {
      console.error('Failed to generate embedding:', error)
      // Continue without embedding - can be enriched later
    }

    const { data: newBook, error: bookError } = await supabase
      .from('books')
      .insert({
        isbn: bookRequest.isbn || null,
        title: bookRequest.title,
        author: bookRequest.author,
        description: bookRequest.description || null,
        ai_summary: aiSummary || null,
        page_count: bookRequest.page_count || null,
        publish_date: bookRequest.publish_date || null,
        genres: genres,
        cover_url: bookRequest.cover_url || null,
        embedding: embedding,
        status: 'available',
        created_by: user.id,
      })
      .select()
      .single()

    if (!bookError && newBook) {
      bookId = newBook.id
    }
  }

  // Update request status
  const newStatus = bookId ? 'fulfilled' : 'approved'
  const { data: updated, error: updateError } = await supabase
    .from('book_requests')
    .update({
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      book_id: bookId,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return jsonError(updateError.message, 500)

  // Notify the user - use appropriate template based on whether book was created
  const template = bookId
    ? notificationTemplates.bookRequestFulfilled(bookRequest.title)
    : notificationTemplates.bookRequestApproved(bookRequest.title)

  await createNotification({
    supabase,
    userId: bookRequest.user_id,
    type: template.type,
    title: template.title,
    message: template.message,
    bookId: bookId || undefined,
  })

  return jsonSuccess(updated)
}
