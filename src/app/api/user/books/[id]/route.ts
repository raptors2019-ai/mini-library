import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth

  const { data: userBook, error } = await supabase
    .from('user_books')
    .select('*, book:books(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return jsonError('Not found', 404)
  }

  return jsonSuccess({ userBook })
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const body = await request.json()
  const { status, rating, review, date_started, date_finished } = body

  const { data: userBook, error } = await supabase
    .from('user_books')
    .update({ status, rating, review, date_started, date_finished })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, book:books(*)')
    .single()

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ userBook })
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth

  const { error } = await supabase
    .from('user_books')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ success: true })
}
