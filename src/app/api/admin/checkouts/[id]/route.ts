import { createClient } from '@/lib/supabase/server'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminRole, WAITLIST_HOLD_DURATION } from '@/lib/constants'

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
      // Calculate when premium hold phase ends
      const premiumHoldEnds = new Date()
      premiumHoldEnds.setHours(premiumHoldEnds.getHours() + WAITLIST_HOLD_DURATION.premium)

      // Update book status to on_hold_premium with hold_until
      await supabase
        .from('books')
        .update({
          status: 'on_hold_premium',
          hold_until: premiumHoldEnds.toISOString()
        })
        .eq('id', checkout.book_id)

      // Notify premium waitlist members
      if (waitlistEntry.is_priority) {
        const template = notificationTemplates.waitlistAvailable(
          checkout.book?.title || 'Unknown Book',
          `Claim by ${premiumHoldEnds.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (premium early access)`
        )
        await createNotification({
          supabase,
          userId: waitlistEntry.user_id,
          bookId: checkout.book_id,
          ...template,
        })
      }
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
