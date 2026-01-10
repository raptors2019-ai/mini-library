import { NextRequest } from 'next/server'
import {
  requireAdmin,
  isErrorResponse,
  jsonError,
  jsonSuccess,
  getPaginationParams,
  createPaginationResponse,
} from '@/lib/api-utils'

// GET - List all book requests (admin only)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { supabase } = auth
  const { searchParams } = new URL(request.url)
  const { page, limit, offset } = getPaginationParams(searchParams)
  const status = searchParams.get('status')

  let query = supabase
    .from('book_requests')
    .select(`
      *,
      user:profiles!user_id(id, email, full_name, avatar_url),
      reviewer:profiles!reviewed_by(id, full_name),
      book:books(id, title, cover_url)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return jsonError(error.message, 500)

  return jsonSuccess({
    requests: data,
    pagination: createPaginationResponse(page, limit, count || 0),
  })
}
