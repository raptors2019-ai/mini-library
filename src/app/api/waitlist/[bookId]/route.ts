import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ bookId: string }>
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { bookId } = await params
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth

  const { error } = await supabase
    .from('waitlist')
    .update({ status: 'cancelled' })
    .eq('book_id', bookId)
    .eq('user_id', user.id)
    .eq('status', 'waiting')

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ success: true })
}
