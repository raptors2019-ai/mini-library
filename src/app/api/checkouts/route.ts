import { createClient } from '@/lib/supabase/server'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { getCurrentDate, isOverdue } from '@/lib/simulated-date'
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
    .select('checkout_limit, hold_duration_days')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

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

  // Check book status (belt and suspenders)
  const { data: book } = await supabase
    .from('books')
    .select('status')
    .eq('id', book_id)
    .single()

  if (!book || book.status !== 'available') {
    return NextResponse.json({ error: 'Book not available' }, { status: 400 })
  }

  // Calculate due date based on current (possibly simulated) date
  const dueDate = new Date(currentDate)
  dueDate.setDate(dueDate.getDate() + profile.hold_duration_days)

  // Update book status FIRST to prevent race conditions
  // Only update if still available - this is atomic and prevents race conditions
  const { data: updatedBooks, error: updateError } = await supabase
    .from('books')
    .update({ status: 'checked_out' })
    .eq('id', book_id)
    .eq('status', 'available')
    .select('id')

  if (updateError) {
    console.error('Failed to update book status:', updateError)
    return NextResponse.json({ error: 'Failed to checkout book' }, { status: 500 })
  }

  // If no rows were updated, book was already checked out (race condition)
  if (!updatedBooks || updatedBooks.length === 0) {
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
    // Rollback book status if checkout creation fails
    await supabase
      .from('books')
      .update({ status: 'available' })
      .eq('id', book_id)
    return NextResponse.json({ error: checkoutError.message }, { status: 500 })
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
