import { NextRequest } from 'next/server'
import { requireAdmin, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'
import { createNotification, notificationTemplates } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST - Decline a book request
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const { id } = await params
  const body = await request.json()
  const { reason } = body // Optional decline reason

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

  // Update request status
  const { data: updated, error: updateError } = await supabase
    .from('book_requests')
    .update({
      status: 'declined',
      admin_notes: reason || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return jsonError(updateError.message, 500)

  // Notify the user
  const template = notificationTemplates.bookRequestDeclined(bookRequest.title, reason)

  await createNotification({
    supabase,
    userId: bookRequest.user_id,
    type: template.type,
    title: template.title,
    message: template.message,
  })

  return jsonSuccess(updated)
}
