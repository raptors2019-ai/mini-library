import { NextResponse } from 'next/server'
import { requireAuth, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

export async function PUT(): Promise<NextResponse> {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ success: true })
}
