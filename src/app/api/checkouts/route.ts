import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('checkout_limit, hold_duration_days')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Check active checkouts count
  const { count: activeCount } = await supabase
    .from('checkouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active')

  if ((activeCount || 0) >= profile.checkout_limit) {
    return NextResponse.json({ error: 'Checkout limit reached' }, { status: 400 })
  }

  const body = await request.json()
  const { book_id } = body

  if (!book_id) {
    return NextResponse.json({ error: 'Book ID required' }, { status: 400 })
  }

  // Check book availability
  const { data: book } = await supabase
    .from('books')
    .select('status')
    .eq('id', book_id)
    .single()

  if (!book || book.status !== 'available') {
    return NextResponse.json({ error: 'Book not available' }, { status: 400 })
  }

  // Calculate due date
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + profile.hold_duration_days)

  // Create checkout and update book status
  const { data: checkout, error: checkoutError } = await supabase
    .from('checkouts')
    .insert({
      book_id,
      user_id: user.id,
      due_date: dueDate.toISOString()
    })
    .select()
    .single()

  if (checkoutError) {
    return NextResponse.json({ error: checkoutError.message }, { status: 500 })
  }

  // Update book status
  await supabase
    .from('books')
    .update({ status: 'checked_out' })
    .eq('id', book_id)

  return NextResponse.json(checkout, { status: 201 })
}
