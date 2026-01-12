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

  // Allow leaving waitlist from either 'waiting' or 'notified' status
  const { error } = await supabase
    .from('waitlist')
    .update({ status: 'cancelled' })
    .eq('book_id', bookId)
    .eq('user_id', user.id)
    .in('status', ['waiting', 'notified'])

  if (error) {
    return jsonError(error.message, 500)
  }

  // If the user was in 'notified' status (had an active hold), update book status
  // to make it available for the next person in line
  const { data: nextInLine } = await supabase
    .from('waitlist')
    .select('id, user_id')
    .eq('book_id', bookId)
    .eq('status', 'waiting')
    .order('is_priority', { ascending: false })
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (!nextInLine) {
    // No one else waiting, make book available using SECURITY DEFINER function
    await supabase.rpc('set_book_available', { p_book_id: bookId })
  }

  return jsonSuccess({ success: true })
}
