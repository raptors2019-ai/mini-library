import { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentDate } from './simulated-date'
import { createNotification, notificationTemplates } from './notifications'
import { WAITLIST_HOLD_DURATION, getHoldDurationHours } from './constants'

/**
 * Process hold status transitions for books.
 * Called lazily on dashboard load and when viewing book details.
 *
 * Transitions (when hold_until date passes):
 * - on_hold_premium → on_hold_waitlist (or available if no waitlist)
 * - on_hold_waitlist → available
 */
export async function processHoldTransitions(supabase: SupabaseClient): Promise<{
  premiumToWaitlist: number
  waitlistToAvailable: number
}> {
  const now = await getCurrentDate(supabase)
  let premiumToWaitlist = 0
  let waitlistToAvailable = 0

  // Get books in hold states where hold_until has passed
  const { data: booksOnHold } = await supabase
    .from('books')
    .select('id, title, status, hold_until')
    .in('status', ['on_hold_premium', 'on_hold_waitlist'])
    .not('hold_until', 'is', null)
    .lt('hold_until', now.toISOString())

  if (!booksOnHold || booksOnHold.length === 0) {
    return { premiumToWaitlist, waitlistToAvailable }
  }

  for (const book of booksOnHold) {
    if (book.status === 'on_hold_premium') {
      // Premium hold expired - check if there are waitlist entries
      const { data: waitlistEntries } = await supabase
        .from('waitlist')
        .select('id, user_id, is_priority')
        .eq('book_id', book.id)
        .eq('status', 'waiting')

      if (waitlistEntries && waitlistEntries.length > 0) {
        // Transition to on_hold_waitlist with new hold_until
        const newHoldUntil = new Date(now)
        newHoldUntil.setHours(newHoldUntil.getHours() + WAITLIST_HOLD_DURATION.waitlist)

        await supabase
          .from('books')
          .update({
            status: 'on_hold_waitlist',
            hold_until: newHoldUntil.toISOString()
          })
          .eq('id', book.id)

        premiumToWaitlist++

        // Mark ALL waitlist members (both premium and regular) as 'notified' and set expiration
        for (const entry of waitlistEntries) {
          // Get user's role to determine their hold duration
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', entry.user_id)
            .single()

          const holdHours = getHoldDurationHours(userProfile?.role)
          const expiresAt = new Date(now)
          expiresAt.setHours(expiresAt.getHours() + holdHours)

          // Update waitlist entry to 'notified'
          await supabase
            .from('waitlist')
            .update({
              status: 'notified',
              notified_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
            })
            .eq('id', entry.id)

          // Only notify regular users (premium were already notified in premium phase)
          if (!entry.is_priority) {
            const template = notificationTemplates.waitlistAvailable(
              book.title,
              `Claim by ${newHoldUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            )
            await createNotification({
              supabase,
              userId: entry.user_id,
              bookId: book.id,
              ...template,
            })
          }
        }
      } else {
        // No waitlist, make available
        await supabase
          .from('books')
          .update({ status: 'available', hold_until: null })
          .eq('id', book.id)

        waitlistToAvailable++
      }
    } else if (book.status === 'on_hold_waitlist') {
      // Waitlist hold expired - make available
      await supabase
        .from('books')
        .update({ status: 'available', hold_until: null })
        .eq('id', book.id)

      waitlistToAvailable++
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
    .select('id, title, status, hold_until')
    .eq('id', bookId)
    .single()

  if (!book || !book.hold_until) {
    return
  }

  if (!['on_hold_premium', 'on_hold_waitlist'].includes(book.status)) {
    return
  }

  const holdUntil = new Date(book.hold_until)
  if (now < holdUntil) {
    // Hold hasn't expired yet
    return
  }

  if (book.status === 'on_hold_premium') {
    // Check for waitlist entries
    const { data: waitlistEntries } = await supabase
      .from('waitlist')
      .select('id, user_id, is_priority')
      .eq('book_id', bookId)
      .eq('status', 'waiting')

    if (waitlistEntries && waitlistEntries.length > 0) {
      // Transition to on_hold_waitlist
      const newHoldUntil = new Date(now)
      newHoldUntil.setHours(newHoldUntil.getHours() + WAITLIST_HOLD_DURATION.waitlist)

      await supabase
        .from('books')
        .update({
          status: 'on_hold_waitlist',
          hold_until: newHoldUntil.toISOString()
        })
        .eq('id', bookId)

      // Mark ALL waitlist members as 'notified' and set expiration
      for (const entry of waitlistEntries) {
        // Get user's role to determine their hold duration
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', entry.user_id)
          .single()

        const holdHours = getHoldDurationHours(userProfile?.role)
        const expiresAt = new Date(now)
        expiresAt.setHours(expiresAt.getHours() + holdHours)

        // Update waitlist entry to 'notified'
        await supabase
          .from('waitlist')
          .update({
            status: 'notified',
            notified_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', entry.id)

        // Only notify regular users (premium were already notified)
        if (!entry.is_priority) {
          const template = notificationTemplates.waitlistAvailable(
            book.title,
            `Claim by ${newHoldUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
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
      await supabase
        .from('books')
        .update({ status: 'available', hold_until: null })
        .eq('id', bookId)
    }
  } else if (book.status === 'on_hold_waitlist') {
    // Waitlist hold expired - make available
    await supabase
      .from('books')
      .update({ status: 'available', hold_until: null })
      .eq('id', bookId)
  }
}

/**
 * Get the hold end date for a book.
 * Returns null if the book is not in a hold status.
 */
export function getHoldEndDate(
  holdUntil: string | null,
  status: string
): Date | null {
  if (!holdUntil || !['on_hold_premium', 'on_hold_waitlist'].includes(status)) {
    return null
  }
  return new Date(holdUntil)
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
    .select('status, hold_until')
    .eq('id', bookId)
    .single()

  if (!book) {
    return { allowed: false, reason: 'Book not found' }
  }

  // Check if user is on waitlist (either waiting or notified)
  const { data: waitlistEntry } = await supabase
    .from('waitlist')
    .select('id, is_priority')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .in('status', ['waiting', 'notified'])
    .single()

  const isOnWaitlist = !!waitlistEntry

  switch (book.status) {
    case 'available':
      return { allowed: true }

    case 'checked_out':
      return { allowed: false, reason: 'Book is currently checked out' }

    case 'on_hold_premium':
      // Only premium waitlist members can checkout
      if (isPriorityUser && isOnWaitlist) {
        return { allowed: true }
      }
      if (!isPriorityUser && isOnWaitlist) {
        const holdEnd = getHoldEndDate(book.hold_until, book.status)
        const dateStr = holdEnd?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'soon'
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
      const holdEnd = getHoldEndDate(book.hold_until, book.status)
      const dateStr = holdEnd?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'soon'
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
