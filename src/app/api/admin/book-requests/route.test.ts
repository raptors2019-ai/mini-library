/**
 * Tests for /api/admin/book-requests endpoint
 * Admin operations: list all book requests
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
  getPaginationParams: (searchParams: URLSearchParams) => {
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = (page - 1) * limit
    return { page, limit, offset }
  },
  createPaginationResponse: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }),
}))

// Import after mocks
import { GET } from './route'

// Helper to create mock request
function createMockRequest(url: string) {
  return { url }
}

describe('/api/admin/book-requests', () => {
  const mockAdminUser = { id: 'admin-123', email: 'admin@example.com' }
  const mockSupabase = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET - List all book requests (admin)', () => {
    it('returns 401 if not authenticated', async () => {
      mockRequireAdmin.mockResolvedValue({ data: { error: 'Unauthorized' }, status: 401 })

      const request = createMockRequest('http://localhost:3000/api/admin/book-requests')
      const response = await GET(request as never)

      expect(response.status).toBe(401)
    })

    it('returns 403 if not admin role', async () => {
      mockRequireAdmin.mockResolvedValue({ data: { error: 'Forbidden' }, status: 403 })

      const request = createMockRequest('http://localhost:3000/api/admin/book-requests')
      const response = await GET(request as never)

      expect(response.status).toBe(403)
      expect(response.data.error).toBe('Forbidden')
    })

    it('returns all requests with user and reviewer info', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          title: 'Book 1',
          author: 'Author 1',
          status: 'pending',
          user: { id: 'user-1', email: 'user1@example.com', full_name: 'User One' },
          reviewer: null,
          book: null,
        },
        {
          id: 'req-2',
          title: 'Book 2',
          author: 'Author 2',
          status: 'approved',
          user: { id: 'user-2', email: 'user2@example.com', full_name: 'User Two' },
          reviewer: { id: 'admin-123', full_name: 'Admin' },
          book: null,
        },
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockRequests,
          error: null,
          count: 2,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest('http://localhost:3000/api/admin/book-requests')
      const response = await GET(request as never)

      expect(response.status).toBe(200)
      expect(response.data.requests).toHaveLength(2)
      expect(response.data.requests[0].user.email).toBe('user1@example.com')
      expect(response.data.requests[1].reviewer.full_name).toBe('Admin')
    })

    it('filters by status when provided', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [{ id: 'req-1', status: 'pending' }],
          error: null,
          count: 1,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests?status=pending'
      )
      const response = await GET(request as never)

      expect(response.status).toBe(200)
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('does not filter when status is "all"', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests?status=all'
      )
      await GET(request as never)

      expect(mockQuery.eq).not.toHaveBeenCalledWith('status', 'all')
    })

    it('supports pagination', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 50,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest(
        'http://localhost:3000/api/admin/book-requests?page=2&limit=10'
      )
      const response = await GET(request as never)

      expect(response.status).toBe(200)
      expect(response.data.pagination.page).toBe(2)
      expect(response.data.pagination.limit).toBe(10)
      expect(response.data.pagination.total).toBe(50)
      expect(response.data.pagination.totalPages).toBe(5)
      expect(mockQuery.range).toHaveBeenCalledWith(10, 19)
    })

    it('handles database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
          count: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAdmin.mockResolvedValue({
        user: mockAdminUser,
        supabase: mockSupabase,
        profile: { role: 'admin' },
      })

      const request = createMockRequest('http://localhost:3000/api/admin/book-requests')
      const response = await GET(request as never)

      expect(response.status).toBe(500)
      expect(response.data.error).toBe('Database connection failed')
    })

    it('works for librarian role', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAdmin.mockResolvedValue({
        user: { id: 'librarian-123' },
        supabase: mockSupabase,
        profile: { role: 'librarian' },
      })

      const request = createMockRequest('http://localhost:3000/api/admin/book-requests')
      const response = await GET(request as never)

      expect(response.status).toBe(200)
    })
  })
})
