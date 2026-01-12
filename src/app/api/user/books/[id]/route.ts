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

  // Only include fields that were explicitly provided
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status !== undefined) updateData.status = status
  if (rating !== undefined) updateData.rating = rating
  if (review !== undefined) updateData.review = review
  if (date_started !== undefined) updateData.date_started = date_started
  if (date_finished !== undefined) updateData.date_finished = date_finished

  const { data: userBook, error } = await supabase
    .from('user_books')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, book:books(*)')
    .single()

  if (error) {
    return jsonError(error.message, 500)
  }

  // Recalculate taste profile when rating or status changes
  if (rating !== undefined || status !== undefined) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/user/taste-profile`, {
      method: 'POST',
      headers: { 'Cookie': request.headers.get('cookie') || '' }
    }).catch(err => console.error('Taste profile recalc failed:', err))
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
