import { executeTool } from './execute-tool'
import { GENRES } from '@/lib/constants'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock OpenAI
jest.mock('@/lib/openai', () => ({
  generateEmbedding: jest.fn(),
}))

// Mock notifications
jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn(),
  notificationTemplates: {
    adminNewBookRequest: jest.fn().mockReturnValue({
      type: 'admin_new_book_request',
      title: 'New Book Request',
      message: 'Test message',
    }),
  },
}))

describe('executeTool', () => {
  describe('unknown tool', () => {
    it('should return error for unknown tool', async () => {
      const result = await executeTool('unknown_tool', {})
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown tool: unknown_tool')
    })
  })

  describe('get_available_genres', () => {
    it('should return all available genres', async () => {
      const result = await executeTool('get_available_genres', {})
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        genres: GENRES,
        count: GENRES.length,
      })
    })
  })

  describe('show_books_on_page', () => {
    it('should return open_search action when search query provided', async () => {
      const result = await executeTool('show_books_on_page', { search: 'mystery books' })
      expect(result.success).toBe(true)
      expect(result.action).toEqual({
        type: 'open_search',
        payload: { query: 'mystery books' },
      })
      expect(result.data).toEqual({
        message: 'Opening search page for "mystery books"',
        query: 'mystery books',
      })
    })

    it('should return apply_filters action when genres provided', async () => {
      const result = await executeTool('show_books_on_page', {
        genres: ['Fiction', 'Mystery'],
      })
      expect(result.success).toBe(true)
      expect(result.action).toEqual({
        type: 'apply_filters',
        payload: {
          search: undefined,
          genres: ['Fiction', 'Mystery'],
          statuses: undefined,
        },
      })
    })

    it('should return apply_filters action when statuses provided', async () => {
      const result = await executeTool('show_books_on_page', {
        statuses: ['available'],
      })
      expect(result.success).toBe(true)
      expect(result.action).toEqual({
        type: 'apply_filters',
        payload: {
          search: undefined,
          genres: undefined,
          statuses: ['available'],
        },
      })
    })

    it('should return apply_filters with combined filters', async () => {
      const result = await executeTool('show_books_on_page', {
        genres: ['Fiction'],
        statuses: ['available', 'checked_out'],
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        message: 'Opening books page with genres: Fiction, status: available, checked_out',
        filters: {
          genres: ['Fiction'],
          statuses: ['available', 'checked_out'],
        },
      })
    })

    it('should return "Opening all books" when no filters', async () => {
      const result = await executeTool('show_books_on_page', {})
      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Opening all books')
    })
  })

  describe('search_books', () => {
    const { createClient } = require('@/lib/supabase/server')
    const { generateEmbedding } = require('@/lib/openai')

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should perform semantic search when embeddings work', async () => {
      const mockBooks = [
        { id: '1', title: 'Test Book', author: 'Author' },
      ]

      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])

      createClient.mockResolvedValue({
        rpc: jest.fn().mockResolvedValue({
          data: mockBooks,
          error: null,
        }),
      })

      const result = await executeTool('search_books', { query: 'test query' })
      expect(result.success).toBe(true)
      expect(result.books).toEqual(mockBooks)
      expect(result.data?.searchType).toBe('semantic')
    })

    it('should fall back to text search when semantic fails', async () => {
      const mockBooks = [
        { id: '1', title: 'Test Book', author: 'Author' },
      ]

      generateEmbedding.mockRejectedValue(new Error('OpenAI error'))

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockResolvedValue({
          data: mockBooks,
          error: null,
        }),
      }

      createClient.mockResolvedValue(mockQuery)

      const result = await executeTool('search_books', { query: 'test' })
      expect(result.success).toBe(true)
      expect(result.data?.searchType).toBe('text')
    })

    it('should filter by author when provided', async () => {
      const mockBooks = [
        { id: '1', title: 'Test Book', author: 'John Smith' },
        { id: '2', title: 'Another Book', author: 'Jane Doe' },
      ]

      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])

      createClient.mockResolvedValue({
        rpc: jest.fn().mockResolvedValue({
          data: mockBooks,
          error: null,
        }),
      })

      const result = await executeTool('search_books', {
        query: 'test',
        author: 'John',
      })
      expect(result.success).toBe(true)
      expect(result.books).toHaveLength(1)
      expect(result.books?.[0].author).toBe('John Smith')
    })

    it('should filter by genre when provided', async () => {
      const mockBooks = [
        { id: '1', title: 'Test Book', author: 'Author', genres: ['Fiction', 'Mystery'] },
        { id: '2', title: 'Another Book', author: 'Author', genres: ['Romance'] },
      ]

      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])

      createClient.mockResolvedValue({
        rpc: jest.fn().mockResolvedValue({
          data: mockBooks,
          error: null,
        }),
      })

      const result = await executeTool('search_books', {
        query: 'test',
        genre: 'Mystery',
      })
      expect(result.success).toBe(true)
      expect(result.books).toHaveLength(1)
      expect(result.books?.[0].genres).toContain('Mystery')
    })

    it('should respect limit parameter', async () => {
      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])

      const mockRpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      createClient.mockResolvedValue({
        rpc: mockRpc,
      })

      await executeTool('search_books', { query: 'test', limit: 3 })
      expect(mockRpc).toHaveBeenCalledWith('match_books', expect.objectContaining({
        match_count: 3,
      }))
    })

    it('should cap limit at 10', async () => {
      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])

      const mockRpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      createClient.mockResolvedValue({
        rpc: mockRpc,
      })

      await executeTool('search_books', { query: 'test', limit: 100 })
      expect(mockRpc).toHaveBeenCalledWith('match_books', expect.objectContaining({
        match_count: 10,
      }))
    })
  })

  describe('get_book_details', () => {
    const { createClient } = require('@/lib/supabase/server')

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return book details with waitlist count', async () => {
      const mockBook = {
        id: '1',
        title: 'Test Book',
        author: 'Author',
        status: 'available',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBook, error: null }),
      })

      // Mock for waitlist count query
      const mockFromChain = {
        from: jest.fn().mockImplementation((table) => {
          if (table === 'books') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockBook, error: null }),
            }
          }
          if (table === 'waitlist') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ count: 2, error: null }),
            }
          }
          return { select: jest.fn().mockReturnThis() }
        }),
      }

      createClient.mockResolvedValue(mockFromChain)

      const result = await executeTool('get_book_details', { book_id: '1' })
      expect(result.success).toBe(true)
      expect(result.books).toHaveLength(1)
      expect(result.books?.[0]).toEqual(mockBook)
    })

    it('should return error when book not found', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })

      const result = await executeTool('get_book_details', { book_id: 'nonexistent' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Book not found')
    })
  })

  describe('check_availability', () => {
    const { createClient } = require('@/lib/supabase/server')

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return availability for available book', async () => {
      const mockBook = {
        id: '1',
        title: 'Test Book',
        author: 'Author',
        status: 'available',
      }

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBook, error: null }),
      })

      const result = await executeTool('check_availability', { book_id: '1' })
      expect(result.success).toBe(true)
      expect(result.data?.isAvailable).toBe(true)
      expect(result.data?.status).toBe('available')
    })

    it('should return error when book not found', async () => {
      createClient.mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })

      const result = await executeTool('check_availability', { book_id: 'nonexistent' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Book not found')
    })
  })

  describe('request_book', () => {
    it('should return error when user not logged in', async () => {
      const result = await executeTool('request_book', {
        title: 'Test Book',
        author: 'Test Author',
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('must be logged in')
    })
  })

  describe('find_similar_books', () => {
    it('should return error when no book_id or title provided', async () => {
      const { createClient } = require('@/lib/supabase/server')

      createClient.mockResolvedValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await executeTool('find_similar_books', {})
      expect(result.success).toBe(false)
      expect(result.error).toContain('provide either a book_id or title')
    })
  })

  describe('error handling', () => {
    it('should catch and return errors from tool execution', async () => {
      const { createClient } = require('@/lib/supabase/server')

      createClient.mockRejectedValue(new Error('Database connection failed'))

      const result = await executeTool('search_books', { query: 'test' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })
  })
})
