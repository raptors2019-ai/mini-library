import { NextRequest } from 'next/server'
import { requireAdmin, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get a single book request
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { supabase } = auth
  const { id } = await params

  const { data: bookRequest, error } = await supabase
    .from('book_requests')
    .select('*, user:profiles!user_id(full_name, email, avatar_url)')
    .eq('id', id)
    .single()

  if (error || !bookRequest) {
    return jsonError('Request not found', 404)
  }

  return jsonSuccess(bookRequest)
}
