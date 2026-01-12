import { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentDate } from './simulated-date'
import { createNotification, notificationTemplates } from './notifications'
import { WAITLIST_HOLD_DURATION } from './constants'

/**
 * Process hold status transitions for books.
 * Called lazily on dashboard load and when viewing book details.
 *
 * Transitions:
 * - on_hold_premium → on_hold_waitlist (after WAITLIST_HOLD_DURATION.premium hours)
 * - on_hold_waitlist → available (after WAITLIST_HOLD_DURATION.waitlist hours from waitlist phase)
 */
export async function processHoldTransitions(supabase: SupabaseClient): Promise<{
  premiumToWaitlist: number
  waitlistToAvailable: number
}> {
  const now = await getCurrentDate(supabase)
  let premiumToWaitlist = 0
  let waitlistToAvailable = 0

  // Get books in hold states
  const { data: booksOnHold } = await supabase
    .from('books')
    .select('id, title, status, hold_started_at')
    .in('status', ['on_hold_premium', 'on_hold_waitlist'])
    .not('hold_started_at', 'is', null)

  if (!booksOnHold || booksOnHold.length === 0) {
    return { premiumToWaitlist, waitlistToAvailable }
  }

  for (const book of booksOnHold) {
    const holdStarted = new Date(book.hold_started_at)
    const hoursSinceHoldStarted = (now.getTime() - holdStarted.getTime()) / (1000 * 60 * 60)

    if (book.status === 'on_hold_premium') {
      // Check if premium hold period is over
      if (hoursSinceHoldStarted >= WAITLIST_HOLD_DURATION.premium) {
        // Check if there are any waitlist entries (priority or not)
        const { data: waitlistEntries } = await supabase
          .from('waitlist')
          .select('id, user_id, is_priority')
          .eq('book_id', book.id)
          .eq('status', 'waiting')

        if (waitlistEntries && waitlistEntries.length > 0) {
          // Transition to on_hold_waitlist
          await supabase
            .from('books')
            .update({ status: 'on_hold_waitlist' })
            .eq('id', book.id)

          premiumToWaitlist++

          // Calculate when waitlist hold ends
          const waitlistHoldEnds = new Date(holdStarted)
          waitlistHoldEnds.setHours(
            waitlistHoldEnds.getHours() +
            WAITLIST_HOLD_DURATION.premium +
            WAITLIST_HOLD_DURATION.waitlist
          )

          // Notify regular (non-premium) waitlist members
          const regularEntries = waitlistEntries.filter(entry => !entry.is_priority)
          for (const entry of regularEntries) {
            const template = notificationTemplates.waitlistAvailable(
              book.title,
              `Claim by ${waitlistHoldEnds.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            )
            await createNotification({
              supabase,
              userId: entry.user_id,
              bookId: book.id,
              ...template,
            })
          }
        } else {
          // No waitlist, make available
          await supabase
            .from('books')
            .update({ status: 'available', hold_started_at: null })
            .eq('id', book.id)

          waitlistToAvailable++
        }
      }
    } else if (book.status === 'on_hold_waitlist') {
      // Check if total hold period is over (premium + waitlist duration)
      const totalHoldDuration = WAITLIST_HOLD_DURATION.premium + WAITLIST_HOLD_DURATION.waitlist
      if (hoursSinceHoldStarted >= totalHoldDuration) {
        // Check if there are still waiting entries
        const { data: waitlistEntries } = await supabase
          .from('waitlist')
          .select('id')
          .eq('book_id', book.id)
          .eq('status', 'waiting')
          .limit(1)

        if (!waitlistEntries || waitlistEntries.length === 0) {
          // No more waitlist, make available
          await supabase
            .from('books')
            .update({ status: 'available', hold_started_at: null })
            .eq('id', book.id)

          waitlistToAvailable++
        }
        // If there's still a waitlist, keep on_hold_waitlist until someone claims or leaves
      }
    }
  }

  return { premiumToWaitlist, waitlistToAvailable }
}

/**
 * Process hold transitions for a single book.
 * Useful when viewing a specific book page.
 */
export async function processBookHoldTransition(
  supabase: SupabaseClient,
  bookId: string
): Promise<void> {
  const now = await getCurrentDate(supabase)

  const { data: book } = await supabase
    .from('books')
    .select('id, title, status, hold_started_at')
    .eq('id', bookId)
    .single()

  if (!book || !book.hold_started_at) {
    return
  }

  if (!['on_hold_premium', 'on_hold_waitlist'].includes(book.status)) {
    return
  }

  const holdStarted = new Date(book.hold_started_at)
  const hoursSinceHoldStarted = (now.getTime() - holdStarted.getTime()) / (1000 * 60 * 60)

  if (book.status === 'on_hold_premium' && hoursSinceHoldStarted >= WAITLIST_HOLD_DURATION.premium) {
    // Check for waitlist entries
    const { data: waitlistEntries } = await supabase
      .from('waitlist')
      .select('id, user_id, is_priority')
      .eq('book_id', bookId)
      .eq('status', 'waiting')

    if (waitlistEntries && waitlistEntries.length > 0) {
      await supabase
        .from('books')
        .update({ status: 'on_hold_waitlist' })
        .eq('id', bookId)

      // Notify regular waitlist members
      const waitlistHoldEnds = new Date(holdStarted)
      waitlistHoldEnds.setHours(
        waitlistHoldEnds.getHours() +
        WAITLIST_HOLD_DURATION.premium +
        WAITLIST_HOLD_DURATION.waitlist
      )

      const regularEntries = waitlistEntries.filter(entry => !entry.is_priority)
      for (const entry of regularEntries) {
        const template = notificationTemplates.waitlistAvailable(
          book.title,
          `Claim by ${waitlistHoldEnds.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        )
        await createNotification({
          supabase,
          userId: entry.user_id,
          bookId,
          ...template,
        })
      }
    } else {
      await supabase
        .from('books')
        .update({ status: 'available', hold_started_at: null })
        .eq('id', bookId)
    }
  } else if (book.status === 'on_hold_waitlist') {
    const totalHoldDuration = WAITLIST_HOLD_DURATION.premium + WAITLIST_HOLD_DURATION.waitlist
    if (hoursSinceHoldStarted >= totalHoldDuration) {
      const { data: waitlistEntries } = await supabase
        .from('waitlist')
        .select('id')
        .eq('book_id', bookId)
        .eq('status', 'waiting')
        .limit(1)

      if (!waitlistEntries || waitlistEntries.length === 0) {
        await supabase
          .from('books')
          .update({ status: 'available', hold_started_at: null })
          .eq('id', bookId)
      }
    }
  }
}

/**
 * Calculate hold end dates for a book.
 * Returns null if the book is not in a hold status.
 */
export function getHoldEndDates(
  holdStartedAt: string | null,
  status: string
): { premiumEnds: Date; waitlistEnds: Date } | null {
  if (!holdStartedAt || !['on_hold_premium', 'on_hold_waitlist'].includes(status)) {
    return null
  }

  const holdStarted = new Date(holdStartedAt)

  const premiumEnds = new Date(holdStarted)
  premiumEnds.setHours(premiumEnds.getHours() + WAITLIST_HOLD_DURATION.premium)

  const waitlistEnds = new Date(holdStarted)
  waitlistEnds.setHours(
    waitlistEnds.getHours() +
    WAITLIST_HOLD_DURATION.premium +
    WAITLIST_HOLD_DURATION.waitlist
  )

  return { premiumEnds, waitlistEnds }
}

/**
 * Check if a user can checkout a book based on hold status.
 */
export async function canUserCheckout(
  supabase: SupabaseClient,
  bookId: string,
  userId: string,
  isPriorityUser: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: book } = await supabase
    .from('books')
    .select('status, hold_started_at')
    .eq('id', bookId)
    .single()

  if (!book) {
    return { allowed: false, reason: 'Book not found' }
  }

  // Check if user is on waitlist
  const { data: waitlistEntry } = await supabase
    .from('waitlist')
    .select('id, is_priority')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .eq('status', 'waiting')
    .single()

  const isOnWaitlist = !!waitlistEntry

  switch (book.status) {
    case 'available':
      return { allowed: true }

    case 'checked_out':
      return { allowed: false, reason: 'Book is currently checked out' }

    case 'on_hold':
      // Legacy on_hold - individual hold for notified user
      return { allowed: false, reason: 'Book is on hold for another user' }

    case 'on_hold_premium':
      // Only premium waitlist members can checkout
      if (isPriorityUser && isOnWaitlist) {
        return { allowed: true }
      }
      if (!isPriorityUser && isOnWaitlist) {
        const holdDates = getHoldEndDates(book.hold_started_at, book.status)
        const dateStr = holdDates?.premiumEnds.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return {
          allowed: false,
          reason: `On hold for premium members until ${dateStr}`
        }
      }
      return { allowed: false, reason: 'Book is on hold for waitlist members' }

    case 'on_hold_waitlist':
      // Any waitlist member can checkout
      if (isOnWaitlist) {
        return { allowed: true }
      }
      const holdDates = getHoldEndDates(book.hold_started_at, book.status)
      const dateStr = holdDates?.waitlistEnds.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return {
        allowed: false,
        reason: `On hold for waitlist members until ${dateStr}`
      }

    case 'inactive':
      return { allowed: false, reason: 'Book is not available for checkout' }

    default:
      return { allowed: false, reason: 'Unknown book status' }
  }
}
