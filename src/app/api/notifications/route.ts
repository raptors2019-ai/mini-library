import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const { searchParams } = new URL(request.url)

  const unreadOnly = searchParams.get('unread') === 'true'
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('notifications')
    .select('*, book:books(id, title, cover_url)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data: notifications, error, count } = await query

  if (error) {
    return jsonError(error.message, 500)
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return jsonSuccess({
    notifications,
    unread_count: unreadCount || 0,
    pagination: { total: count || 0, limit, offset },
  })
}
