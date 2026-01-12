import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { getHoldDurationHours } from '@/lib/constants'
import { getCurrentDate } from '@/lib/simulated-date'

// Process expired waitlist holds
export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()
  const now = await getCurrentDate(supabase)

  // Find all expired holds (status = 'notified' and expires_at < now)
  const { data: expiredEntries, error: fetchError } = await supabase
    .from('waitlist')
    .select('*, book:books(id, title, status), user:profiles(id, role)')
    .eq('status', 'notified')
    .lt('expires_at', now.toISOString())

  if (fetchError) {
    console.error('Error fetching expired waitlist entries:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!expiredEntries || expiredEntries.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No expired entries' })
  }

  let processedCount = 0

  for (const entry of expiredEntries) {
    const bookId = entry.book_id
    const bookTitle = entry.book?.title || 'Unknown Book'
    const expiredUserId = entry.user_id

    // 1. Mark the expired entry as 'expired'
    await supabase
      .from('waitlist')
      .update({ status: 'expired' })
      .eq('id', entry.id)

    // 2. Notify the user that their hold expired
    const expiredNotification = notificationTemplates.waitlistExpired(bookTitle)
    await createNotification({
      supabase,
      userId: expiredUserId,
      bookId,
      ...expiredNotification,
    })

    // 3. Find the next person in line
    const { data: nextInLine } = await supabase
      .from('waitlist')
      .select('id, user_id, is_priority')
      .eq('book_id', bookId)
      .eq('status', 'waiting')
      .order('is_priority', { ascending: false })
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (nextInLine) {
      // Get next person's role for hold duration
      const { data: nextUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', nextInLine.user_id)
        .single()

      // Calculate new hold expiration
      const holdHours = getHoldDurationHours(nextUserProfile?.role)
      const expiresAt = new Date(now)
      expiresAt.setHours(expiresAt.getHours() + holdHours)

      // Update next person to 'notified' status
      await supabase
        .from('waitlist')
        .update({
          status: 'notified',
          notified_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', nextInLine.id)

      // Notify the next person
      const expirationLabel = holdHours === 24 ? '24 hours' : `${holdHours / 24} days`
      const availableNotification = notificationTemplates.waitlistAvailable(bookTitle, expirationLabel)
      await createNotification({
        supabase,
        userId: nextInLine.user_id,
        bookId,
        ...availableNotification,
      })
    } else {
      // No one else in line, make book available using SECURITY DEFINER function
      await supabase.rpc('set_book_available', { p_book_id: bookId })
    }

    processedCount++
  }

  return NextResponse.json({
    processed: processedCount,
    message: `Processed ${processedCount} expired waitlist entries`,
  })
}

// Also support GET for easy testing/cron
export async function GET(): Promise<NextResponse> {
  return POST()
}
