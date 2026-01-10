import { createClient } from '@/lib/supabase/server'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/constants'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createClient()

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { action, extend_days } = body

  // Get the checkout
  const { data: checkout, error: fetchError } = await supabase
    .from('checkouts')
    .select('*, book:books(id, title)')
    .eq('id', id)
    .single()

  if (fetchError || !checkout) {
    return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
  }

  if (action === 'extend') {
    // Extend due date
    const days = extend_days || 7
    const newDueDate = new Date(checkout.due_date)
    newDueDate.setDate(newDueDate.getDate() + days)

    const { data, error } = await supabase
      .from('checkouts')
      .update({ due_date: newDueDate.toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  if (action === 'return') {
    // Mark as returned
    const { data, error } = await supabase
      .from('checkouts')
      .update({
        status: 'returned',
        returned_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update book status to available
    await supabase
      .from('books')
      .update({ status: 'available' })
      .eq('id', checkout.book_id)

    // Check waitlist and notify first person
    const { data: waitlistEntry } = await supabase
      .from('waitlist')
      .select('*, user:profiles(id, email, full_name)')
      .eq('book_id', checkout.book_id)
      .eq('status', 'waiting')
      .order('is_priority', { ascending: false })
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (waitlistEntry) {
      // Update waitlist entry
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3) // 3 days to claim

      await supabase
        .from('waitlist')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', waitlistEntry.id)

      // Create notification for waitlist user
      const template = notificationTemplates.waitlistAvailable(
        checkout.book?.title || 'Unknown Book'
      )
      await createNotification({
        supabase,
        userId: waitlistEntry.user_id,
        bookId: checkout.book_id,
        ...template,
      })

      // Update book status to on_hold
      await supabase
        .from('books')
        .update({ status: 'on_hold' })
        .eq('id', checkout.book_id)
    }

    // Create return notification for the user
    const returnTemplate = notificationTemplates.bookReturned(
      checkout.book?.title || 'Unknown Book'
    )
    await createNotification({
      supabase,
      userId: checkout.user_id,
      bookId: checkout.book_id,
      ...returnTemplate,
    })

    return NextResponse.json(data)
  }

  if (action === 'mark_overdue') {
    // Mark as overdue
    const { data, error } = await supabase
      .from('checkouts')
      .update({ status: 'overdue' })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create overdue notification
    const overdueTemplate = notificationTemplates.overdue(
      checkout.book?.title || 'Unknown Book'
    )
    await createNotification({
      supabase,
      userId: checkout.user_id,
      bookId: checkout.book_id,
      ...overdueTemplate,
    })

    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
