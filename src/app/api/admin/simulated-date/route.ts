import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getSimulatedDate, setSimulatedDate, daysBetween, isOverdue, isDueSoon } from '@/lib/simulated-date'
import { createNotification, notificationTemplates } from '@/lib/notifications'

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

  // Set the simulated date
  const result = await setSimulatedDate(supabase, newDate, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // If setting a date (not resetting), generate notifications
  let notificationsGenerated = 0
  if (newDate) {
    notificationsGenerated = await generateDateBasedNotifications(supabase, newDate)
  }

  return NextResponse.json({
    success: true,
    simulatedDate: newDate?.toISOString() || null,
    notificationsGenerated,
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

  const result = await setSimulatedDate(supabase, null, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    simulatedDate: null,
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
