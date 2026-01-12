import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getSimulatedDate, setSimulatedDate, daysBetween, isOverdue, isDueSoon, getAutoReturnConfigs, AutoReturnConfig } from '@/lib/simulated-date'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { getHoldDurationHours } from '@/lib/constants'

// GET - Get current simulated date
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const simulatedDate = await getSimulatedDate(supabase)

  return NextResponse.json({
    simulatedDate: simulatedDate?.toISOString() || null,
    isSimulating: simulatedDate !== null,
    realDate: new Date().toISOString(),
  })
}

// POST - Set simulated date and generate notifications
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin or librarian
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'librarian'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { date } = body

  // Parse the date (can be null to reset)
  let newDate: Date | null = null
  if (date) {
    newDate = new Date(date)
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
  }

  // Check if we're starting a new simulation (no previous simulated date)
  const previousSimulatedDate = await getSimulatedDate(supabase)
  const isNewSimulation = newDate && !previousSimulatedDate

  // If starting a new simulation, record the start time
  if (isNewSimulation) {
    await supabase
      .from('system_settings')
      .upsert({
        key: 'simulation_started_at',
        value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
  }

  // Set the simulated date
  const result = await setSimulatedDate(supabase, newDate, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // If setting a date (not resetting), generate notifications and process auto-returns
  let notificationsGenerated = 0
  let autoReturnsProcessed = 0
  let autoReturnsReverted = 0

  if (newDate) {
    notificationsGenerated = await generateDateBasedNotifications(supabase, newDate)
    const autoReturnResult = await processAutoReturns(supabase, newDate)
    autoReturnsProcessed = autoReturnResult.processed
    autoReturnsReverted = autoReturnResult.reverted
  }

  return NextResponse.json({
    success: true,
    simulatedDate: newDate?.toISOString() || null,
    notificationsGenerated,
    autoReturnsProcessed,
    autoReturnsReverted,
  })
}

// DELETE - Reset to real time
export async function DELETE(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin or librarian
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'librarian'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
  }

  // Get the simulation start time to clean up notifications
  const { data: startTimeSetting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'simulation_started_at')
    .single()

  let notificationsDeleted = 0
  let autoReturnsReverted = 0

  // Revert any auto-returned checkouts back to their original state
  const configs = await getAutoReturnConfigs(supabase)
  for (const config of configs) {
    const { data: checkout } = await supabase
      .from('checkouts')
      .select('status')
      .eq('id', config.checkout_id)
      .single()

    if (checkout?.status === 'returned') {
      // Revert to original state
      await supabase
        .from('checkouts')
        .update({
          status: config.original_status,
          returned_at: null,
        })
        .eq('id', config.checkout_id)

      // Update book status back to checked_out
      await supabase
        .from('books')
        .update({ status: 'checked_out' })
        .eq('id', config.book_id)

      // Revert any waitlist entries that were notified
      await supabase
        .from('waitlist')
        .update({
          status: 'waiting',
          notified_at: null,
          expires_at: null,
        })
        .eq('book_id', config.book_id)
        .eq('status', 'notified')

      autoReturnsReverted++
    }
  }

  // Delete notifications created during simulation (due_soon and overdue types only)
  if (startTimeSetting?.value) {
    const startTime = startTimeSetting.value as string
    const { count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .in('type', ['due_soon', 'overdue', 'book_returned', 'waitlist_available'])
      .gte('created_at', startTime)

    notificationsDeleted = count || 0

    // Also revert any checkouts marked as overdue during simulation back to active
    await supabase
      .from('checkouts')
      .update({ status: 'active' })
      .eq('status', 'overdue')

    // Clear the simulation start time
    await supabase
      .from('system_settings')
      .delete()
      .eq('key', 'simulation_started_at')
  }

  const result = await setSimulatedDate(supabase, null, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    simulatedDate: null,
    notificationsDeleted,
    autoReturnsReverted,
    message: 'Reset to real time',
  })
}

/**
 * Generate notifications based on the simulated date.
 * - Due Soon: 2 days before due date
 * - Overdue: 1+ days after due date
 */
async function generateDateBasedNotifications(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  currentDate: Date
): Promise<number> {
  let count = 0

  // Get all active checkouts with book info
  const { data: checkouts } = await supabase
    .from('checkouts')
    .select(`
      id,
      user_id,
      book_id,
      due_date,
      status,
      books (
        id,
        title
      )
    `)
    .eq('status', 'active')

  if (!checkouts) return 0

  for (const checkout of checkouts) {
    const dueDate = new Date(checkout.due_date)
    // Supabase returns single object for many-to-one relations
    const book = checkout.books as unknown as { title: string } | null
    const bookTitle = book?.title || 'Unknown Book'

    // Check for overdue (1+ days past due)
    if (isOverdue(dueDate, currentDate)) {
      // Check if we already sent an overdue notification for this checkout
      const { data: existingOverdue } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', checkout.user_id)
        .eq('book_id', checkout.book_id)
        .eq('type', 'overdue')
        .limit(1)

      if (!existingOverdue || existingOverdue.length === 0) {
        const template = notificationTemplates.overdue(bookTitle)
        await createNotification({
          supabase,
          userId: checkout.user_id,
          bookId: checkout.book_id,
          ...template,
        })
        count++

        // Also update checkout status to overdue
        await supabase
          .from('checkouts')
          .update({ status: 'overdue' })
          .eq('id', checkout.id)
      }
    }
    // Check for due soon (exactly 2 days before)
    else if (isDueSoon(dueDate, currentDate, 2)) {
      const daysUntilDue = daysBetween(currentDate, dueDate)

      // Only send if we haven't already sent a due_soon for this checkout
      const { data: existingDueSoon } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', checkout.user_id)
        .eq('book_id', checkout.book_id)
        .eq('type', 'due_soon')
        .limit(1)

      if (!existingDueSoon || existingDueSoon.length === 0) {
        const template = notificationTemplates.dueSoon(bookTitle, daysUntilDue)
        await createNotification({
          supabase,
          userId: checkout.user_id,
          bookId: checkout.book_id,
          ...template,
        })
        count++
      }
    }
  }

  return count
}

/**
 * Process auto-returns based on the simulated date.
 * - If simulated date >= return_date: auto-return the book
 * - If simulated date < return_date: revert to checked-out state
 */
async function processAutoReturns(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  simulatedDate: Date
): Promise<{ processed: number; reverted: number }> {
  const configs = await getAutoReturnConfigs(supabase)
  let processed = 0
  let reverted = 0

  for (const config of configs) {
    const returnDate = new Date(config.return_date)
    const shouldBeReturned = simulatedDate >= returnDate

    // Get current checkout status
    const { data: checkout } = await supabase
      .from('checkouts')
      .select('id, status, book_id, user_id, book:books(id, title)')
      .eq('id', config.checkout_id)
      .single()

    if (!checkout) continue

    const isCurrentlyReturned = checkout.status === 'returned'
    const book = checkout.book as unknown as { id: string; title: string } | null
    const bookTitle = book?.title || 'Unknown Book'

    if (shouldBeReturned && !isCurrentlyReturned) {
      // Auto-return the book
      await supabase
        .from('checkouts')
        .update({
          status: 'returned',
          returned_at: returnDate.toISOString(),
        })
        .eq('id', config.checkout_id)

      // Check waitlist for this book
      const { data: nextInLine } = await supabase
        .from('waitlist')
        .select('id, user_id, is_priority')
        .eq('book_id', config.book_id)
        .eq('status', 'waiting')
        .order('is_priority', { ascending: false })
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (nextInLine) {
        // Update book status to on_hold
        await supabase
          .from('books')
          .update({ status: 'on_hold' })
          .eq('id', config.book_id)

        // Get next person's profile to determine hold duration
        const { data: nextUserProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', nextInLine.user_id)
          .single()

        // Calculate hold expiration based on user's role
        const holdHours = getHoldDurationHours(nextUserProfile?.role)
        const expiresAt = new Date(returnDate)
        expiresAt.setHours(expiresAt.getHours() + holdHours)

        await supabase
          .from('waitlist')
          .update({
            status: 'notified',
            notified_at: returnDate.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', nextInLine.id)

        // Notify the next person
        const expirationLabel = holdHours === 24 ? '1 day' : `${holdHours / 24} days`
        const template = notificationTemplates.waitlistAvailable(bookTitle, expirationLabel)
        await createNotification({
          supabase,
          userId: nextInLine.user_id,
          bookId: config.book_id,
          ...template,
        })
      } else {
        // No waitlist, make book available
        await supabase
          .from('books')
          .update({ status: 'available' })
          .eq('id', config.book_id)
      }

      // Create return notification
      const returnTemplate = notificationTemplates.bookReturned(bookTitle)
      await createNotification({
        supabase,
        userId: checkout.user_id,
        bookId: config.book_id,
        ...returnTemplate,
      })

      processed++
    } else if (!shouldBeReturned && isCurrentlyReturned) {
      // Revert to checked-out state (simulated date is before return date)
      await supabase
        .from('checkouts')
        .update({
          status: config.original_status,
          returned_at: null,
        })
        .eq('id', config.checkout_id)

      // Update book status back to checked_out
      await supabase
        .from('books')
        .update({ status: 'checked_out' })
        .eq('id', config.book_id)

      // Revert any waitlist entries that were notified back to waiting
      await supabase
        .from('waitlist')
        .update({
          status: 'waiting',
          notified_at: null,
          expires_at: null,
        })
        .eq('book_id', config.book_id)
        .eq('status', 'notified')

      // Delete auto-generated notifications for this book
      await supabase
        .from('notifications')
        .delete()
        .eq('book_id', config.book_id)
        .in('type', ['book_returned', 'waitlist_available'])

      reverted++
    }
  }

  return { processed, reverted }
}
