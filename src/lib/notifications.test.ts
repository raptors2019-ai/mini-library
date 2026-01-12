/**
 * Tests for notification utilities
 */

import { createNotification, notificationTemplates } from './notifications'

describe('notifications', () => {
  describe('createNotification', () => {
    const mockInsert = jest.fn()
    const mockSelect = jest.fn()
    const mockSingle = jest.fn()

    const mockSupabase = {
      from: jest.fn(() => ({
        insert: mockInsert.mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle,
          }),
        }),
      })),
    }

    beforeEach(() => {
      jest.clearAllMocks()
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('creates a notification successfully', async () => {
      const mockNotification = {
        id: 'notif-123',
        user_id: 'user-456',
        type: 'checkout_confirmed',
        title: 'Book Checked Out',
        message: 'You checked out a book',
        book_id: 'book-789',
      }

      mockSingle.mockResolvedValue({ data: mockNotification, error: null })

      const result = await createNotification({
        supabase: mockSupabase as never,
        userId: 'user-456',
        type: 'checkout_confirmed',
        title: 'Book Checked Out',
        message: 'You checked out a book',
        bookId: 'book-789',
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-456',
        type: 'checkout_confirmed',
        title: 'Book Checked Out',
        message: 'You checked out a book',
        book_id: 'book-789',
      })
      expect(result).toEqual(mockNotification)
    })

    it('handles notification without bookId', async () => {
      const mockNotification = {
        id: 'notif-123',
        user_id: 'user-456',
        type: 'system',
        title: 'System Notice',
        message: 'Welcome!',
        book_id: null,
      }

      mockSingle.mockResolvedValue({ data: mockNotification, error: null })

      const result = await createNotification({
        supabase: mockSupabase as never,
        userId: 'user-456',
        type: 'system',
        title: 'System Notice',
        message: 'Welcome!',
      })

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-456',
        type: 'system',
        title: 'System Notice',
        message: 'Welcome!',
        book_id: null,
      })
      expect(result).toEqual(mockNotification)
    })

    it('returns null and logs error on failure', async () => {
      const error = { message: 'Database error' }
      mockSingle.mockResolvedValue({ data: null, error })

      const result = await createNotification({
        supabase: mockSupabase as never,
        userId: 'user-456',
        type: 'system',
        title: 'Test',
        message: 'Test message',
      })

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('Failed to create notification:', error)
    })
  })

  describe('notificationTemplates', () => {
    describe('checkoutConfirmed', () => {
      it('creates checkout confirmation template', () => {
        const result = notificationTemplates.checkoutConfirmed('The Great Gatsby', 'Jan 15, 2025')

        expect(result).toEqual({
          type: 'checkout_confirmed',
          title: 'Book Checked Out',
          message: 'You have successfully checked out "The Great Gatsby". Due date: Jan 15, 2025',
        })
      })
    })

    describe('dueSoon', () => {
      it('creates due soon template for 1 day', () => {
        const result = notificationTemplates.dueSoon('1984', 1)

        expect(result).toEqual({
          type: 'due_soon',
          title: 'Book Due Soon',
          message: '"1984" is due in 1 day. Please return it on time.',
        })
      })

      it('creates due soon template for multiple days', () => {
        const result = notificationTemplates.dueSoon('1984', 3)

        expect(result).toEqual({
          type: 'due_soon',
          title: 'Book Due Soon',
          message: '"1984" is due in 3 days. Please return it on time.',
        })
      })
    })

    describe('overdue', () => {
      it('creates overdue template', () => {
        const result = notificationTemplates.overdue('Brave New World')

        expect(result).toEqual({
          type: 'overdue',
          title: 'Book Overdue',
          message: '"Brave New World" is overdue. Please return it as soon as possible.',
        })
      })
    })

    describe('waitlistJoined', () => {
      it('creates waitlist joined template with estimated date', () => {
        const result = notificationTemplates.waitlistJoined('Dune', 2, 'Feb 1, 2025')

        expect(result).toEqual({
          type: 'waitlist_joined',
          title: 'Added to Waitlist',
          message: 'You\'re #2 on the waitlist for "Dune". Estimated availability: Feb 1, 2025.',
        })
      })

      it('creates waitlist joined template without estimated date', () => {
        const result = notificationTemplates.waitlistJoined('Dune', 5)

        expect(result).toEqual({
          type: 'waitlist_joined',
          title: 'Added to Waitlist',
          message: 'You\'re #5 on the waitlist for "Dune". We\'ll notify you when it\'s available.',
        })
      })
    })

    describe('waitlistAvailable', () => {
      it('creates waitlist available template with custom expiration', () => {
        const result = notificationTemplates.waitlistAvailable('Foundation', '48 hours')

        expect(result).toEqual({
          type: 'waitlist_available',
          title: 'Book Available!',
          message: '"Foundation" is now available for you. You have 48 hours to claim it before it\'s offered to the next person.',
        })
      })

      it('creates waitlist available template with default expiration', () => {
        const result = notificationTemplates.waitlistAvailable('Foundation')

        expect(result).toEqual({
          type: 'waitlist_available',
          title: 'Book Available!',
          message: '"Foundation" is now available for you. You have 24 hours to claim it before it\'s offered to the next person.',
        })
      })
    })

    describe('waitlistExpired', () => {
      it('creates waitlist expired template', () => {
        const result = notificationTemplates.waitlistExpired('Neuromancer')

        expect(result).toEqual({
          type: 'waitlist_expired',
          title: 'Hold Expired',
          message: 'You missed your time window to claim "Neuromancer". The book has been offered to the next person. Check availability or join the waitlist again.',
        })
      })
    })

    describe('bookReturned', () => {
      it('creates book returned template', () => {
        const result = notificationTemplates.bookReturned('Snow Crash')

        expect(result).toEqual({
          type: 'book_returned',
          title: 'Book Returned',
          message: 'You have successfully returned "Snow Crash". Thank you!',
        })
      })
    })

    describe('bookRequestSubmitted', () => {
      it('creates book request submitted template', () => {
        const result = notificationTemplates.bookRequestSubmitted('The Martian')

        expect(result).toEqual({
          type: 'book_request_submitted',
          title: 'Book Request Submitted',
          message: 'Your request for "The Martian" has been submitted. You\'ll be notified when a librarian reviews it.',
        })
      })
    })

    describe('bookRequestApproved', () => {
      it('creates book request approved template', () => {
        const result = notificationTemplates.bookRequestApproved('Project Hail Mary')

        expect(result).toEqual({
          type: 'book_request_approved',
          title: 'Book Request Approved',
          message: 'Good news! Your request for "Project Hail Mary" has been approved and will be added to the library soon.',
        })
      })
    })

    describe('bookRequestFulfilled', () => {
      it('creates book request fulfilled template when book added', () => {
        const result = notificationTemplates.bookRequestFulfilled('Project Hail Mary')

        expect(result).toEqual({
          type: 'book_request_approved',
          title: 'Book Now Available',
          message: '"Project Hail Mary" is now available in the library! You can check it out now.',
        })
      })
    })

    describe('bookRequestDeclined', () => {
      it('creates book request declined template with reason', () => {
        const result = notificationTemplates.bookRequestDeclined('Some Book', 'Already in catalog')

        expect(result).toEqual({
          type: 'book_request_declined',
          title: 'Book Request Declined',
          message: 'Your request for "Some Book" was declined. Reason: Already in catalog',
        })
      })

      it('creates book request declined template without reason', () => {
        const result = notificationTemplates.bookRequestDeclined('Some Book')

        expect(result).toEqual({
          type: 'book_request_declined',
          title: 'Book Request Declined',
          message: 'Your request for "Some Book" was declined.',
        })
      })
    })

    describe('adminNewBookRequest', () => {
      it('creates admin notification for new book request', () => {
        const result = notificationTemplates.adminNewBookRequest('Atomic Habits', 'James Clear', 'John Doe')

        expect(result).toEqual({
          type: 'admin_new_book_request',
          title: 'New Book Request',
          message: 'John Doe has requested "Atomic Habits" by James Clear. Review it in the admin panel.',
        })
      })
    })
  })
})
