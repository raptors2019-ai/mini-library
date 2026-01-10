import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createClient()

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !book) {
    return jsonError('Book not found', 404)
  }

  // Get current checkout if exists (include overdue - book is still checked out)
  const { data: checkout } = await supabase
    .from('checkouts')
    .select('*, user:profiles(id, full_name, email)')
    .eq('book_id', id)
    .in('status', ['active', 'overdue'])
    .single()

  // Get waitlist count
  const { count: waitlistCount } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', id)
    .eq('status', 'waiting')

  return jsonSuccess({
    ...(book as Record<string, unknown>),
    current_checkout: checkout || null,
    waitlist_count: waitlistCount || 0,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { supabase } = auth
  const body = await request.json()

  const { data: updatedBook, error } = await supabase
    .from('books')
    .update({
      title: body.title,
      author: body.author,
      isbn: body.isbn,
      description: body.description,
      cover_url: body.cover_url,
      page_count: body.page_count,
      publish_date: body.publish_date,
      genres: body.genres,
      status: body.status
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess(updatedBook)
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { supabase, profile } = auth

  // Only full admin can delete (not librarian)
  if (profile.role !== 'admin') {
    return jsonError('Forbidden - Admin only', 403)
  }

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id)

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ success: true })
}
