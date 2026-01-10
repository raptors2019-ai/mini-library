import { NextRequest } from 'next/server'
import { requireAuth, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get a specific book request
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const { id } = await params

  const { data, error } = await supabase
    .from('book_requests')
    .select('*, book:books(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return jsonError('Request not found', 404)
  }

  return jsonSuccess(data)
}

// DELETE - Cancel a pending request
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const { id } = await params

  // Verify ownership and pending status
  const { data: existing } = await supabase
    .from('book_requests')
    .select('id, user_id, status')
    .eq('id', id)
    .single()

  if (!existing) {
    return jsonError('Request not found', 404)
  }

  if (existing.user_id !== user.id) {
    return jsonError('Forbidden', 403)
  }

  if (existing.status !== 'pending') {
    return jsonError('Can only cancel pending requests', 400)
  }

  const { error } = await supabase
    .from('book_requests')
    .delete()
    .eq('id', id)

  if (error) return jsonError(error.message, 500)

  return jsonSuccess({ success: true })
}
