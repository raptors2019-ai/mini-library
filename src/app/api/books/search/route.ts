import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  getPaginationParams,
  createPaginationResponse,
  jsonError,
  jsonSuccess,
} from '@/lib/api-utils'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q')
  const { page, limit, offset } = getPaginationParams(searchParams)

  if (!query) {
    return jsonError('Search query required', 400)
  }

  const { data: books, error, count } = await supabase
    .from('books')
    .select('*', { count: 'exact' })
    .neq('status', 'inactive')
    .or(`title.ilike.%${query}%,author.ilike.%${query}%,description.ilike.%${query}%`)
    .order('title')
    .range(offset, offset + limit - 1)

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({
    books,
    query,
    pagination: createPaginationResponse(page, limit, count || 0),
  })
}
