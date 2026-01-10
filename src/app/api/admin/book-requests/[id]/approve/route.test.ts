/**
 * Tests for /api/admin/book-requests/[id]/approve endpoint
 * Admin operation: approve book requests
 */

// Mock next/server before any imports
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      ({ data, status: init?.status || 200 }),
  },
}))

// Mock the api-utils module
const mockRequireAdmin = jest.fn()
jest.mock('@/lib/api-utils', () => ({
  requireAdmin: () => mockRequireAdmin(),
  isErrorResponse: (result: { status?: number }) =>
    result && typeof result.status === 'number' && result.status >= 400,
  jsonError: (message: string, status: number) => ({ data: { error: message }, status }),
  jsonSuccess: <T>(data: T, status = 200) => ({ data, status }),
}))

// Mock notifications
const mockCreateNotification = jest.fn()
jest.mock('@/lib/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
  notificationTemplates: {
    bookRequestApproved: (title: string) => ({
      type: 'book_request_approved',
      title: 'Book Request Approved',
      message: `Your request for "${title}" has been approved`,
    }),
    bookRequestFulfilled: (title: string) => ({
      type: 'book_request_fulfilled',
      title: 'Book Now Available',
      message: `"${title}" is now available in the library`,
    }),
  },
}))

// Import after mocks
import { POST } from './route'

// Helper to create mock request
function createMockRequest(url: string, body: unknown = {}) {
  return {
    url,
    method: 'POST',
    json: jest.fn().mockResolvedValue(body),
  }
}

describe('/api/admin/book-requests/[id]/approve', () => {
  const mockAdminUser = { id: 'admin-123', email: 'admin@example.com' }
  const mockSupabase = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateNotification.mockResolvedValue({})
  })

  const createParams = (id: string) => ({ params: Promise.resolve({ id }) })

  describe('POST - Approve book request', () => {
    it('returns 401 if not authenticated', async () => {
      mockRequireAdmin.mockResolvedValue({ data: { error: 'Unauthorized' }, status: 401 })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/approve',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(401)
    })

    it('returns 403 if not admin role', async () => {
      mockRequireAdmin.mockResolvedValue({ data: { error: 'Forbidden' }, status: 403 })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/approve',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(403)
    })

    it('returns 404 if request not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/nonexistent/approve',
        {}
      )
      const response = await POST(request as never, createParams('nonexistent'))

      expect(response.status).toBe(404)
      expect(response.data.error).toBe('Request not found')
    })

    it('returns 400 if request already processed', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'req-1',
            status: 'approved',
            title: 'Test Book',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/approve',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(400)
      expect(response.data.error).toBe('Request already processed')
    })

    it('approves request without creating book when createBook is false', async () => {
      const mockBookRequest = {
        id: 'req-1',
        user_id: 'user-456',
        title: 'Test Book',
        author: 'Test Author',
        status: 'pending',
      }

      const mockUpdatedRequest = {
        ...mockBookRequest,
        status: 'approved',
        reviewed_by: mockAdminUser.id,
        book_id: null,
      }

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBookRequest,
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedRequest,
          error: null,
        }),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) return mockSelectQuery
        return mockUpdateQuery
      })

      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/approve',
        { createBook: false }
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(200)
      expect(response.data.status).toBe('approved')
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          type: 'book_request_approved',
        })
      )
    })

    it('approves request and creates book when createBook is true (default)', async () => {
      const mockBookRequest = {
        id: 'req-1',
        user_id: 'user-456',
        title: 'New Book',
        author: 'New Author',
        isbn: '978-1234567890',
        description: 'A great book',
        page_count: 300,
        publish_date: '2024-01-01',
        genres: ['Fiction'],
        cover_url: 'https://example.com/cover.jpg',
        status: 'pending',
      }

      const mockNewBook = {
        id: 'book-new-123',
        title: 'New Book',
        author: 'New Author',
      }

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBookRequest,
          error: null,
        }),
      }

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockNewBook,
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockBookRequest,
            status: 'fulfilled',
            book_id: mockNewBook.id,
            reviewed_by: mockAdminUser.id,
          },
          error: null,
        }),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return mockSelectQuery
        if (table === 'books') return mockInsertQuery
        return mockUpdateQuery
      })

      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/approve',
        { createBook: true }
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(200)
      expect(response.data.status).toBe('fulfilled')
      expect(response.data.book_id).toBe('book-new-123')

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          type: 'book_request_fulfilled',
          bookId: 'book-new-123',
        })
      )
    })

    it('sets status to approved if book creation fails', async () => {
      const mockBookRequest = {
        id: 'req-1',
        user_id: 'user-456',
        title: 'Test Book',
        author: 'Test Author',
        status: 'pending',
      }

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBookRequest,
          error: null,
        }),
      }

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Duplicate ISBN' },
        }),
      }

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockBookRequest,
            status: 'approved',
            book_id: null,
          },
          error: null,
        }),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return mockSelectQuery
        if (table === 'books') return mockInsertQuery
        return mockUpdateQuery
      })

      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/approve',
        { createBook: true }
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(200)
      expect(response.data.status).toBe('approved')
    })

    it('handles update error', async () => {
      const mockBookRequest = {
        id: 'req-1',
        user_id: 'user-456',
        title: 'Test Book',
        status: 'pending',
      }

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBookRequest,
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) return mockSelectQuery
        return mockUpdateQuery
      })

      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/approve',
        { createBook: false }
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(500)
      expect(response.data.error).toBe('Update failed')
    })
  })
})
