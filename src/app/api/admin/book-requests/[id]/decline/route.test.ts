/**
 * Tests for /api/admin/book-requests/[id]/decline endpoint
 * Admin operation: decline book requests
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
    bookRequestDeclined: (title: string, reason?: string) => ({
      type: 'book_request_declined',
      title: 'Book Request Declined',
      message: reason
        ? `Your request for "${title}" was declined. Reason: ${reason}`
        : `Your request for "${title}" was declined.`,
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

describe('/api/admin/book-requests/[id]/decline', () => {
  const mockAdminUser = { id: 'admin-123', email: 'admin@example.com' }
  const mockSupabase = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateNotification.mockResolvedValue({})
  })

  const createParams = (id: string) => ({ params: Promise.resolve({ id }) })

  describe('POST - Decline book request', () => {
    it('returns 401 if not authenticated', async () => {
      mockRequireAdmin.mockResolvedValue({ data: { error: 'Unauthorized' }, status: 401 })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(401)
    })

    it('returns 403 if not admin role', async () => {
      mockRequireAdmin.mockResolvedValue({ data: { error: 'Forbidden' }, status: 403 })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
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
        'http://localhost:3000/api/admin/book-requests/nonexistent/decline',
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
            status: 'declined',
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
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(400)
      expect(response.data.error).toBe('Request already processed')
    })

    it('declines request without reason', async () => {
      const mockBookRequest = {
        id: 'req-1',
        user_id: 'user-456',
        title: 'Test Book',
        author: 'Test Author',
        status: 'pending',
      }

      const mockUpdatedRequest = {
        ...mockBookRequest,
        status: 'declined',
        admin_notes: null,
        reviewed_by: mockAdminUser.id,
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
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(200)
      expect(response.data.status).toBe('declined')
      expect(response.data.admin_notes).toBeNull()

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          type: 'book_request_declined',
        })
      )
    })

    it('declines request with reason', async () => {
      const mockBookRequest = {
        id: 'req-1',
        user_id: 'user-456',
        title: 'Test Book',
        author: 'Test Author',
        status: 'pending',
      }

      const declineReason = 'Book already exists in our catalog'

      const mockUpdatedRequest = {
        ...mockBookRequest,
        status: 'declined',
        admin_notes: declineReason,
        reviewed_by: mockAdminUser.id,
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
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
        { reason: declineReason }
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(200)
      expect(response.data.status).toBe('declined')
      expect(response.data.admin_notes).toBe(declineReason)

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(declineReason),
        })
      )
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
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(500)
      expect(response.data.error).toBe('Update failed')
    })

    it('records reviewer info correctly', async () => {
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
          data: {
            ...mockBookRequest,
            status: 'declined',
            reviewed_by: mockAdminUser.id,
            reviewed_at: '2024-01-15T10:00:00.000Z',
          },
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
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(200)
      expect(response.data.reviewed_by).toBe(mockAdminUser.id)
      expect(response.data.reviewed_at).toBeDefined()
    })

    it('cannot decline already approved requests', async () => {
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
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(400)
      expect(response.data.error).toBe('Request already processed')
    })

    it('cannot decline fulfilled requests', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'req-1',
            status: 'fulfilled',
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
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(400)
    })

    it('works for librarian role', async () => {
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
          data: { ...mockBookRequest, status: 'declined' },
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
        user: { id: 'librarian-123' },
        supabase: mockSupabase,
        profile: { role: 'librarian' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests/req-1/decline',
        {}
      )
      const response = await POST(request as never, createParams('req-1'))

      expect(response.status).toBe(200)
    })
  })
})
