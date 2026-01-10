/**
 * Tests for /api/book-requests endpoint
 * User book request operations: create and list requests
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

// Mock notifications
jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
  notificationTemplates: {
    adminNewBookRequest: (title: string, author: string, requester: string) => ({
      type: 'admin_new_book_request',
      title: 'New Book Request',
      message: `${requester} requested "${title}" by ${author}`,
    }),
    bookRequestSubmitted: (title: string) => ({
      type: 'book_request_submitted',
      title: 'Book Request Submitted',
      message: `Your request for "${title}" has been submitted.`,
    }),
  },
}))

// Import after mocks
import { GET, POST } from './route'

// Helper to create mock request
function createMockRequest(url: string, options: { method?: string; body?: unknown } = {}) {
  return {
    url,
    method: options.method || 'GET',
    json: jest.fn().mockResolvedValue(options.body || {}),
  }
}

describe('/api/book-requests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  const mockSupabase = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET - List user book requests', () => {
    it('returns 401 if not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({ data: { error: 'Unauthorized' }, status: 401 })

      const request = createMockRequest('http://localhost:3000/api/book-requests')
      const response = await GET(request as never)

      expect(response.status).toBe(401)
      expect(response.data.error).toBe('Unauthorized')
    })

    it('returns user requests with pagination', async () => {
      const mockRequests = [
        { id: 'req-1', title: 'Book 1', author: 'Author 1', status: 'pending' },
        { id: 'req-2', title: 'Book 2', author: 'Author 2', status: 'approved' },
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockRequests,
          error: null,
          count: 2,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests')
      const response = await GET(request as never)

      expect(response.status).toBe(200)
      expect(response.data.requests).toHaveLength(2)
      expect(response.data.pagination).toEqual({
        page: 1,
        limit: 12,
        total: 2,
        totalPages: 1,
      })
    })

    it('filters by status when provided', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [{ id: 'req-1', status: 'pending' }],
          error: null,
          count: 1,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests?status=pending')
      const response = await GET(request as never)

      expect(response.status).toBe(200)
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('handles database errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests')
      const response = await GET(request as never)

      expect(response.status).toBe(500)
      expect(response.data.error).toBe('Database error')
    })
  })

  describe('POST - Create book request', () => {
    it('returns 401 if not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({ data: { error: 'Unauthorized' }, status: 401 })

      const request = createMockRequest('http://localhost:3000/api/book-requests', {
        method: 'POST',
        body: { title: 'Test', author: 'Author' },
      })
      const response = await POST(request as never)

      expect(response.status).toBe(401)
    })

    it('returns 400 if title is missing', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests', {
        method: 'POST',
        body: { author: 'Author' },
      })
      const response = await POST(request as never)

      expect(response.status).toBe(400)
      expect(response.data.error).toBe('Title and author are required')
    })

    it('returns 400 if author is missing', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests', {
        method: 'POST',
        body: { title: 'Test' },
      })
      const response = await POST(request as never)

      expect(response.status).toBe(400)
      expect(response.data.error).toBe('Title and author are required')
    })

    it('returns 400 if user already has pending request for same book', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-request' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)
      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests', {
        method: 'POST',
        body: { title: 'Duplicate Book', author: 'Author' },
      })
      const response = await POST(request as never)

      expect(response.status).toBe(400)
      expect(response.data.error).toContain('already have a pending request')
    })

    it('creates request successfully with minimal data', async () => {
      const mockNewRequest = {
        id: 'new-req-1',
        title: 'New Book',
        author: 'New Author',
        status: 'pending',
        user_id: mockUser.id,
      }

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockNewRequest,
          error: null,
        }),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'book_requests') {
          callCount++
          if (callCount === 1) return mockSelectQuery
          return mockInsertQuery
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { full_name: 'Test User', email: 'test@example.com' },
              error: null,
            }),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return mockSelectQuery
      })

      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests', {
        method: 'POST',
        body: { title: 'New Book', author: 'New Author' },
      })
      const response = await POST(request as never)

      expect(response.status).toBe(201)
      expect(response.data.title).toBe('New Book')
      expect(response.data.author).toBe('New Author')
    })

    it('creates request with full book details', async () => {
      const fullBookData = {
        title: 'Complete Book',
        author: 'Full Author',
        isbn: '978-1234567890',
        description: 'A great book',
        cover_url: 'https://example.com/cover.jpg',
        page_count: 300,
        publish_date: '2024-01-01',
        genres: ['Fiction', 'Mystery'],
      }

      const mockNewRequest = {
        id: 'new-req-2',
        ...fullBookData,
        status: 'pending',
        user_id: mockUser.id,
      }

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockNewRequest,
          error: null,
        }),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'book_requests') {
          callCount++
          if (callCount === 1) return mockSelectQuery
          return mockInsertQuery
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { full_name: 'Test User' },
              error: null,
            }),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return mockSelectQuery
      })

      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests', {
        method: 'POST',
        body: fullBookData,
      })
      const response = await POST(request as never)

      expect(response.status).toBe(201)
      expect(response.data.isbn).toBe('978-1234567890')
      expect(response.data.genres).toEqual(['Fiction', 'Mystery'])
    })

    it('handles database insert errors', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      }

      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) return mockSelectQuery
        return mockInsertQuery
      })

      mockRequireAuth.mockResolvedValue({ user: mockUser, supabase: mockSupabase })

      const request = createMockRequest('http://localhost:3000/api/book-requests', {
        method: 'POST',
        body: { title: 'Test', author: 'Author' },
      })
      const response = await POST(request as never)

      expect(response.status).toBe(500)
      expect(response.data.error).toBe('Insert failed')
    })
  })
})
