import { createClient } from '@/lib/supabase/server'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { getCurrentDate, isOverdue } from '@/lib/simulated-date'
import { canUserCheckout, processBookHoldTransition } from '@/lib/hold-transitions'
import { isPriorityRole } from '@/lib/constants'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('checkout_limit, hold_duration_days, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const isPriorityUser = isPriorityRole(profile.role)

  // Get current date (may be simulated)
  const currentDate = await getCurrentDate(supabase)

  // Check for overdue books - users cannot checkout if they have overdue items
  const { data: activeCheckouts } = await supabase
    .from('checkouts')
    .select('id, due_date, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'overdue'])

  if (activeCheckouts) {
    const overdueBooks = activeCheckouts.filter(checkout => {
      const dueDate = new Date(checkout.due_date)
      return checkout.status === 'overdue' || isOverdue(dueDate, currentDate)
    })

    if (overdueBooks.length > 0) {
      return NextResponse.json({
        error: 'You have overdue books. Please return them before checking out new items.',
        overdueCount: overdueBooks.length
      }, { status: 400 })
    }
  }

  // Check active checkouts count
  const activeCount = activeCheckouts?.filter(c => c.status === 'active').length || 0

  if (activeCount >= profile.checkout_limit) {
    return NextResponse.json({ error: 'Checkout limit reached' }, { status: 400 })
  }

  const body = await request.json()
  const { book_id } = body

  if (!book_id) {
    return NextResponse.json({ error: 'Book ID required' }, { status: 400 })
  }

  // Check if user already has this book checked out (including overdue)
  const { data: existingUserCheckout } = await supabase
    .from('checkouts')
    .select('id')
    .eq('book_id', book_id)
    .eq('user_id', user.id)
    .in('status', ['active', 'overdue'])
    .single()

  if (existingUserCheckout) {
    return NextResponse.json({ error: 'You already have this book checked out' }, { status: 400 })
  }

  // Check if anyone has a checkout for this book (inventory = 1)
  const { data: existingCheckout } = await supabase
    .from('checkouts')
    .select('id')
    .eq('book_id', book_id)
    .in('status', ['active', 'overdue'])
    .single()

  if (existingCheckout) {
    return NextResponse.json({ error: 'This book is already checked out' }, { status: 400 })
  }

  // Process any pending hold transitions for this book first
  await processBookHoldTransition(supabase, book_id)

  // Check book status using hold-aware eligibility check
  const { data: book } = await supabase
    .from('books')
    .select('status, hold_until')
    .eq('id', book_id)
    .single()

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  // Check if user can checkout based on book status and waitlist membership
  const eligibility = await canUserCheckout(supabase, book_id, user.id, isPriorityUser)
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason || 'Book not available' }, { status: 400 })
  }

  // Calculate due date based on current (possibly simulated) date
  const dueDate = new Date(currentDate)
  dueDate.setDate(dueDate.getDate() + profile.hold_duration_days)

  // Update book status using SECURITY DEFINER function to bypass RLS
  // This allows regular users to checkout books without needing librarian/admin role
  const { data: checkoutResult, error: updateError } = await supabase
    .rpc('checkout_book', { p_book_id: book_id, p_user_id: user.id })

  if (updateError) {
    console.error('Failed to update book status:', updateError)
    return NextResponse.json({ error: 'Failed to checkout book' }, { status: 500 })
  }

  // If function returned false, book was already checked out (race condition)
  if (!checkoutResult) {
    return NextResponse.json({ error: 'Book is no longer available' }, { status: 400 })
  }

  // Create checkout record
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
    // Rollback book status if checkout creation fails using SECURITY DEFINER function
    // Note: This restores to 'available' - for simplicity we don't track the original hold state
    await supabase.rpc('return_book', { p_book_id: book_id })
    return NextResponse.json({ error: checkoutError.message }, { status: 500 })
  }

  // If user was on waitlist, mark their entry as claimed and reorder positions
  const { data: waitlistEntry } = await supabase
    .from('waitlist')
    .select('id, position')
    .eq('book_id', book_id)
    .eq('user_id', user.id)
    .in('status', ['waiting', 'notified'])
    .single()

  if (waitlistEntry) {
    // Mark entry as claimed
    await supabase
      .from('waitlist')
      .update({ status: 'claimed' })
      .eq('id', waitlistEntry.id)

    // Decrement position for everyone after this user in the queue
    const { data: laterEntries } = await supabase
      .from('waitlist')
      .select('id, position')
      .eq('book_id', book_id)
      .eq('status', 'waiting')
      .gt('position', waitlistEntry.position)

    if (laterEntries && laterEntries.length > 0) {
      for (const entry of laterEntries) {
        await supabase
          .from('waitlist')
          .update({ position: entry.position - 1 })
          .eq('id', entry.id)
      }
    }
  }

  // Get book title for notification
  const { data: bookData } = await supabase
    .from('books')
    .select('title')
    .eq('id', book_id)
    .single()

  // Create checkout confirmation notification
  if (bookData) {
    const template = notificationTemplates.checkoutConfirmed(
      bookData.title,
      dueDate.toLocaleDateString()
    )
    await createNotification({
      supabase,
      userId: user.id,
      bookId: book_id,
      ...template,
    })
  }

  // Revalidate the book page and books list to reflect the new status
  revalidatePath(`/books/${book_id}`)
  revalidatePath('/books')
  revalidatePath('/dashboard')

  return NextResponse.json(checkout, { status: 201 })
}
