import { createClient } from '@/lib/supabase/server'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminRole, WAITLIST_HOLD_DURATION, getHoldDurationHours } from '@/lib/constants'
import { getCurrentDate } from '@/lib/simulated-date'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the checkout
  const { data: checkout, error: checkoutError } = await supabase
    .from('checkouts')
    .select('*, book:books(id, title)')
    .eq('id', id)
    .single()

  if (checkoutError || !checkout) {
    return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
  }

  // Check permission (owner or librarian/admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (checkout.user_id !== user.id && !isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get current date (supports simulation)
  const now = await getCurrentDate(supabase)

  // Mark checkout as returned
  const { error: updateError } = await supabase
    .from('checkouts')
    .update({
      status: 'returned',
      returned_at: now.toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const bookId = checkout.book_id
  const bookTitle = checkout.book?.title || 'Unknown Book'

  // Check waitlist for this book (any waiting entries)
  const { data: waitlistEntries } = await supabase
    .from('waitlist')
    .select('id, user_id, is_priority')
    .eq('book_id', bookId)
    .eq('status', 'waiting')
    .order('is_priority', { ascending: false })
    .order('position', { ascending: true })

  const hasWaitlist = waitlistEntries && waitlistEntries.length > 0
  const hasPriorityWaitlist = waitlistEntries?.some(entry => entry.is_priority)

  if (hasWaitlist) {
    // Calculate when the premium hold phase ends (using simulated date)
    const premiumHoldEnds = new Date(now)
    premiumHoldEnds.setHours(premiumHoldEnds.getHours() + WAITLIST_HOLD_DURATION.premium)

    // Set book to on_hold_premium status with hold_until timestamp
    const { error: bookUpdateError } = await supabase
      .from('books')
      .update({
        status: 'on_hold_premium',
        hold_until: premiumHoldEnds.toISOString()
      })
      .eq('id', bookId)

    if (bookUpdateError) {
      console.error('Failed to update book status to on_hold_premium:', bookUpdateError)
    }

    // Notify and mark premium waitlist members as 'notified'
    if (hasPriorityWaitlist) {
      const premiumEntries = waitlistEntries.filter(entry => entry.is_priority)
      for (const entry of premiumEntries) {
        // Get user's role to determine their hold duration
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', entry.user_id)
          .single()

        const holdHours = getHoldDurationHours(userProfile?.role)
        const expiresAt = new Date(now)
        expiresAt.setHours(expiresAt.getHours() + holdHours)

        // Update waitlist entry to 'notified' with expiration
        await supabase
          .from('waitlist')
          .update({
            status: 'notified',
            notified_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', entry.id)

        const template = notificationTemplates.waitlistAvailable(
          bookTitle,
          `Claim by ${premiumHoldEnds.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (premium early access)`
        )
        await createNotification({
          supabase,
          userId: entry.user_id,
          bookId,
          ...template,
        })
      }
    }
  } else {
    // No waitlist, make book available
    const { error: bookUpdateError } = await supabase
      .from('books')
      .update({ status: 'available', hold_until: null })
      .eq('id', bookId)

    if (bookUpdateError) {
      console.error('Failed to update book status to available:', bookUpdateError)
      // Return error so client knows something went wrong
      return NextResponse.json({
        error: 'Book returned but failed to update availability status',
        details: bookUpdateError.message
      }, { status: 500 })
    }
  }

  // Notify the user who returned the book
  const returnTemplate = notificationTemplates.bookReturned(bookTitle)
  await createNotification({
    supabase,
    userId: checkout.user_id,
    bookId,
    ...returnTemplate,
  })

  // Revalidate pages to reflect the updated status
  revalidatePath(`/books/${bookId}`)
  revalidatePath('/books')
  revalidatePath('/dashboard')

  return NextResponse.json({ success: true, waitlist_notified: hasWaitlist })
}
