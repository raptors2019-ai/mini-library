import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('user_books')
    .select('*, book:books(*)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: userBooks, error } = await query

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ userBooks })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const body = await request.json()
  const { book_id, status = 'read', rating, review, date_started, date_finished } = body

  if (!book_id) {
    return jsonError('Book ID required', 400)
  }

  // Check if already exists
  const { data: existing } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', book_id)
    .single()

  if (existing) {
    // Update existing entry
    const { data, error } = await supabase
      .from('user_books')
      .update({ status, rating, review, date_started, date_finished })
      .eq('id', existing.id)
      .select('*, book:books(*)')
      .single()

    if (error) {
      return jsonError(error.message, 500)
    }

    return jsonSuccess({ userBook: data })
  }

  // Create new entry
  const { data, error } = await supabase
    .from('user_books')
    .insert({
      user_id: user.id,
      book_id,
      status,
      rating,
      review,
      date_started,
      date_finished,
    })
    .select('*, book:books(*)')
    .single()

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ userBook: data }, 201)
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const { searchParams } = new URL(request.url)
  const bookId = searchParams.get('book_id')

  if (!bookId) {
    return jsonError('Book ID required', 400)
  }

  const { error } = await supabase
    .from('user_books')
    .delete()
    .eq('user_id', user.id)
    .eq('book_id', bookId)

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ success: true })
}
