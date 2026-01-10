/**
 * Tests for /api/book-requests/[id] endpoint
 * User book request operations: get single request and cancel
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
const mockRequireAuth = jest.fn()
jest.mock('@/lib/api-utils', () => ({
  requireAuth: () => mockRequireAuth(),
  isErrorResponse: (result: { status?: number }) =>
    result && typeof result.status === 'number' && result.status >= 400,
  jsonError: (message: string, status: number) => ({ data: { error: message }, status }),
  jsonSuccess: <T>(data: T, status = 200) => ({ data, status }),
}))

// Import after mocks
import { GET, DELETE } from './route'

// Helper to create mock request
function createMockRequest(url: string, options: { method?: string } = {}) {
  return {
    url,
    method: options.method || 'GET',
  }
}

describe('/api/book-requests/[id]', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  const mockSupabase = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET - Get single book request', () => {
    const createParams = (id: string) => ({ params: Promise.resolve({ id }) })

    it('returns 401 if not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({ data: { error: 'Unauthorized' }, status: 401 })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1')
      const response = await GET(request as never, createParams('req-1'))

      expect(response.status).toBe(401)
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
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/nonexistent')
      const response = await GET(request as never, createParams('nonexistent'))

      expect(response.status).toBe(404)
      expect(response.data.error).toBe('Request not found')
    })

    it('returns request if found and owned by user', async () => {
      const mockRequest = {
        id: 'req-1',
        user_id: mockUser.id,
        title: 'Test Book',
        author: 'Test Author',
        status: 'pending',
        book: null,
      }

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRequest,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1')
      const response = await GET(request as never, createParams('req-1'))

      expect(response.status).toBe(200)
      expect(response.data.id).toBe('req-1')
      expect(response.data.title).toBe('Test Book')
    })

    it('queries with correct user_id filter', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1')
      await GET(request as never, createParams('req-1'))

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'req-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUser.id)
    })
  })

  describe('DELETE - Cancel book request', () => {
    const createParams = (id: string) => ({ params: Promise.resolve({ id }) })

    it('returns 401 if not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({ data: { error: 'Unauthorized' }, status: 401 })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request as never, createParams('req-1'))

      expect(response.status).toBe(401)
    })

    it('returns 404 if request not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/nonexistent', {
        method: 'DELETE',
      })
      const response = await DELETE(request as never, createParams('nonexistent'))

      expect(response.status).toBe(404)
      expect(response.data.error).toBe('Request not found')
    })

    it('returns 403 if request belongs to another user', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'req-1',
            user_id: 'other-user-456',
            status: 'pending',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request as never, createParams('req-1'))

      expect(response.status).toBe(403)
      expect(response.data.error).toBe('Forbidden')
    })

    it('returns 400 if request is not pending', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'req-1',
            user_id: mockUser.id,
            status: 'approved',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request as never, createParams('req-1'))

      expect(response.status).toBe(400)
      expect(response.data.error).toBe('Can only cancel pending requests')
    })

    it('successfully deletes pending request owned by user', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'req-1',
            user_id: mockUser.id,
            status: 'pending',
          },
          error: null,
        }),
      }

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) return mockSelectQuery
        return mockDeleteQuery
      })

      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request as never, createParams('req-1'))

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('handles database delete errors', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'req-1',
            user_id: mockUser.id,
            status: 'pending',
          },
          error: null,
        }),
      }

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) return mockSelectQuery
        return mockDeleteQuery
      })

      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request as never, createParams('req-1'))

      expect(response.status).toBe(500)
      expect(response.data.error).toBe('Delete failed')
    })

    it('prevents cancellation of declined requests', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'req-1',
            user_id: mockUser.id,
            status: 'declined',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request as never, createParams('req-1'))

      expect(response.status).toBe(400)
      expect(response.data.error).toBe('Can only cancel pending requests')
    })

    it('prevents cancellation of fulfilled requests', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'req-1',
            user_id: mockUser.id,
            status: 'fulfilled',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests/req-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request as never, createParams('req-1'))

      expect(response.status).toBe(400)
    })
  })
})
