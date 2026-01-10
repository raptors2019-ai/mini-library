import { NextRequest } from 'next/server'
import { requireAdmin, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'
import { createNotification, notificationTemplates } from '@/lib/notifications'

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
    const { data: newBook, error: bookError } = await supabase
      .from('books')
      .insert({
        isbn: bookRequest.isbn || null,
        title: bookRequest.title,
        author: bookRequest.author,
        description: bookRequest.description || null,
        page_count: bookRequest.page_count || null,
        publish_date: bookRequest.publish_date || null,
        genres: bookRequest.genres || [],
        cover_url: bookRequest.cover_url || null,
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

  // Notify the user that their request was approved
  const template = notificationTemplates.bookRequestApproved(bookRequest.title)

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
