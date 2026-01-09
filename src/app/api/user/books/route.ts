import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ userBooks })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { book_id, status = 'read', rating, review, date_started, date_finished } = body

  if (!book_id) {
    return NextResponse.json({ error: 'Book ID required' }, { status: 400 })
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ userBook: data })
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ userBook: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const bookId = searchParams.get('book_id')

  if (!bookId) {
    return NextResponse.json({ error: 'Book ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_books')
    .delete()
    .eq('user_id', user.id)
    .eq('book_id', bookId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
