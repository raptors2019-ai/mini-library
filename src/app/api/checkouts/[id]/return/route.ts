import { createClient } from '@/lib/supabase/server'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminRole } from '@/lib/constants'

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

  // Mark checkout as returned
  const { error: updateError } = await supabase
    .from('checkouts')
    .update({
      status: 'returned',
      returned_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const bookId = checkout.book_id
  const bookTitle = checkout.book?.title || 'Unknown Book'

  // Check waitlist for this book
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
    // Update book status to on_hold
    const { error: bookUpdateError } = await supabase
      .from('books')
      .update({ status: 'on_hold' })
      .eq('id', bookId)

    if (bookUpdateError) {
      console.error('Failed to update book status to on_hold:', bookUpdateError)
    }

    // Update waitlist entry
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await supabase
      .from('waitlist')
      .update({
        status: 'notified',
        notified_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', nextInLine.id)

    // Notify the next person
    const template = notificationTemplates.waitlistAvailable(bookTitle)
    await createNotification({
      supabase,
      userId: nextInLine.user_id,
      bookId,
      ...template,
    })
  } else {
    // No waitlist, make book available
    const { error: bookUpdateError } = await supabase
      .from('books')
      .update({ status: 'available' })
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

  return NextResponse.json({ success: true, waitlist_notified: !!nextInLine })
}
