import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isPriorityRole } from '@/lib/constants'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { book_id } = body

  if (!book_id) {
    return NextResponse.json({ error: 'Book ID required' }, { status: 400 })
  }

  // Check if user already has this book checked out - makes no sense to join waitlist
  const { data: userCheckout } = await supabase
    .from('checkouts')
    .select('id')
    .eq('book_id', book_id)
    .eq('user_id', user.id)
    .in('status', ['active', 'overdue'])
    .single()

  if (userCheckout) {
    return NextResponse.json({ error: 'You already have this book checked out' }, { status: 400 })
  }

  // Check if already on waitlist (active or cancelled)
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id, status')
    .eq('book_id', book_id)
    .eq('user_id', user.id)
    .single()

  if (existing?.status === 'waiting') {
    return NextResponse.json({ error: 'Already on waitlist' }, { status: 400 })
  }

  // Get book details and current checkout info
  const [{ data: book }, { data: currentCheckout }, { data: lastEntry }] = await Promise.all([
    supabase
      .from('books')
      .select('title')
      .eq('id', book_id)
      .single(),
    supabase
      .from('checkouts')
      .select('due_date')
      .eq('book_id', book_id)
      .in('status', ['active', 'overdue'])
      .single(),
    supabase
      .from('waitlist')
      .select('position')
      .eq('book_id', book_id)
      .eq('status', 'waiting')
      .order('position', { ascending: false })
      .limit(1)
      .single(),
  ])

  const position = (lastEntry?.position || 0) + 1

  // Check if user has priority (premium, librarian, admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isPriority = isPriorityRole(profile?.role)

  let entry
  let error

  // If user was previously on waitlist (cancelled), reactivate their entry
  if (existing?.status === 'cancelled') {
    const result = await supabase
      .from('waitlist')
      .update({
        status: 'waiting',
        position,
        is_priority: isPriority,
        created_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()
    entry = result.data
    error = result.error
  } else {
    // New waitlist entry
    const result = await supabase
      .from('waitlist')
      .insert({
        book_id,
        user_id: user.id,
        position,
        is_priority: isPriority
      })
      .select()
      .single()
    entry = result.data
    error = result.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create notification with estimated availability
  if (book?.title) {
    let estimatedDate: string | undefined

    if (currentCheckout?.due_date) {
      // Calculate estimated date based on position and checkout duration (assume 14 days per checkout)
      const dueDate = new Date(currentCheckout.due_date)
      // Add extra days for people ahead in queue (14 days per person)
      const additionalDays = (position - 1) * 14
      dueDate.setDate(dueDate.getDate() + additionalDays)

      estimatedDate = dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: dueDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      })
    }

    const notification = notificationTemplates.waitlistJoined(book.title, position, estimatedDate)
    await createNotification({
      supabase,
      userId: user.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      bookId: book_id,
    })
  }

  return NextResponse.json(entry, { status: 201 })
}
