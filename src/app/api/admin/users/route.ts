import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  isErrorResponse,
  getPaginationParams,
  createPaginationResponse,
  jsonError,
  jsonSuccess,
} from '@/lib/api-utils'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { supabase } = auth
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const role = searchParams.get('role')
  const { page, limit, offset } = getPaginationParams(searchParams)

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  if (role && role !== 'all') {
    query = query.eq('role', role)
  }

  query = query.range(offset, offset + limit - 1)

  const { data: users, error, count } = await query

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({
    users,
    pagination: createPaginationResponse(page, limit, count || 0),
  })
}
