import { SupabaseClient } from '@supabase/supabase-js'
import { NotificationType } from '@/types/database'

interface CreateNotificationParams {
  supabase: SupabaseClient
  userId: string
  type: NotificationType
  title: string
  message: string
  bookId?: string
}

export async function createNotification({
  supabase,
  userId,
  type,
  title,
  message,
  bookId,
}: CreateNotificationParams) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      book_id: bookId || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create notification:', error)
    return null
  }

  return data
}

// Pre-defined notification templates
export const notificationTemplates = {
  checkoutConfirmed: (bookTitle: string, dueDate: string) => ({
    type: 'checkout_confirmed' as NotificationType,
    title: 'Book Checked Out',
    message: `You have successfully checked out "${bookTitle}". Due date: ${dueDate}`,
  }),

  dueSoon: (bookTitle: string, daysLeft: number) => ({
    type: 'due_soon' as NotificationType,
    title: 'Book Due Soon',
    message: `"${bookTitle}" is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Please return it on time.`,
  }),

  overdue: (bookTitle: string) => ({
    type: 'overdue' as NotificationType,
    title: 'Book Overdue',
    message: `"${bookTitle}" is overdue. Please return it as soon as possible.`,
  }),

  waitlistJoined: (bookTitle: string, position: number, estimatedDate?: string) => ({
    type: 'waitlist_joined' as NotificationType,
    title: 'Added to Waitlist',
    message: estimatedDate
      ? `You're #${position} on the waitlist for "${bookTitle}". Estimated availability: ${estimatedDate}.`
      : `You're #${position} on the waitlist for "${bookTitle}". We'll notify you when it's available.`,
  }),

  waitlistAvailable: (bookTitle: string, expirationLabel?: string) => ({
    type: 'waitlist_available' as NotificationType,
    title: 'Book Available!',
    message: `"${bookTitle}" is now available for you. You have ${expirationLabel || '24 hours'} to claim it before it's offered to the next person.`,
  }),

  waitlistExpired: (bookTitle: string) => ({
    type: 'waitlist_expired' as NotificationType,
    title: 'Hold Expired',
    message: `You missed your time window to claim "${bookTitle}". The book has been offered to the next person. Check availability or join the waitlist again.`,
  }),

  bookReturned: (bookTitle: string) => ({
    type: 'book_returned' as NotificationType,
    title: 'Book Returned',
    message: `You have successfully returned "${bookTitle}". Thank you!`,
  }),

  // Book request notifications
  bookRequestSubmitted: (bookTitle: string) => ({
    type: 'book_request_submitted' as NotificationType,
    title: 'Book Request Submitted',
    message: `Your request for "${bookTitle}" has been submitted. You'll be notified when a librarian reviews it.`,
  }),

  bookRequestApproved: (bookTitle: string) => ({
    type: 'book_request_approved' as NotificationType,
    title: 'Book Request Approved',
    message: `Good news! Your request for "${bookTitle}" has been approved and will be added to the library soon.`,
  }),

  bookRequestFulfilled: (bookTitle: string) => ({
    type: 'book_request_approved' as NotificationType,
    title: 'Book Now Available',
    message: `"${bookTitle}" is now available in the library! You can check it out now.`,
  }),

  bookRequestDeclined: (bookTitle: string, reason?: string) => ({
    type: 'book_request_declined' as NotificationType,
    title: 'Book Request Declined',
    message: reason
      ? `Your request for "${bookTitle}" was declined. Reason: ${reason}`
      : `Your request for "${bookTitle}" was declined.`,
  }),

  adminNewBookRequest: (bookTitle: string, author: string, requesterName: string) => ({
    type: 'admin_new_book_request' as NotificationType,
    title: 'New Book Request',
    message: `${requesterName} has requested "${bookTitle}" by ${author}. Review it in the admin panel.`,
  }),
}
