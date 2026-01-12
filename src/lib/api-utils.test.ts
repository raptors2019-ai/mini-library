/**
 * Tests for API utility functions
 */

// Mock next/server with a class that supports instanceof
jest.mock('next/server', () => {
  class MockNextResponse {
    data: unknown
    status: number

    constructor(data: unknown, status: number) {
      this.data = data
      this.status = status
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init?.status || 200)
    }
  }

  return { NextResponse: MockNextResponse }
})

import { NextResponse } from 'next/server'

// Mock supabase client
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

// Import after mocks
import {
  jsonError,
  jsonSuccess,
  getPaginationParams,
  createPaginationResponse,
  requireAuth,
  requireAdmin,
  isErrorResponse,
} from './api-utils'

describe('api-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('jsonError', () => {
    it('creates error response with message and status', () => {
      const response = jsonError('Not found', 404)

      expect(response).toHaveProperty('data', { error: 'Not found' })
      expect(response).toHaveProperty('status', 404)
    })

    it('creates 401 unauthorized response', () => {
      const response = jsonError('Unauthorized', 401)

      expect(response).toHaveProperty('data', { error: 'Unauthorized' })
      expect(response).toHaveProperty('status', 401)
    })

    it('creates 500 server error response', () => {
      const response = jsonError('Internal server error', 500)

      expect(response).toHaveProperty('data', { error: 'Internal server error' })
      expect(response).toHaveProperty('status', 500)
    })
  })

  describe('jsonSuccess', () => {
    it('creates success response with data and default 200 status', () => {
      const data = { id: '123', name: 'Test' }
      const response = jsonSuccess(data)

      expect(response).toHaveProperty('data', data)
      expect(response).toHaveProperty('status', 200)
    })

    it('creates success response with custom status', () => {
      const data = { created: true }
      const response = jsonSuccess(data, 201)

      expect(response).toHaveProperty('data', data)
      expect(response).toHaveProperty('status', 201)
    })

    it('handles array data', () => {
      const data = [{ id: '1' }, { id: '2' }]
      const response = jsonSuccess(data)

      expect(response).toHaveProperty('data', data)
      expect(response).toHaveProperty('status', 200)
    })

    it('handles null data', () => {
      const response = jsonSuccess(null)

      expect(response).toHaveProperty('data', null)
      expect(response).toHaveProperty('status', 200)
    })
  })

  describe('getPaginationParams', () => {
    it('parses page and limit from search params', () => {
      const params = new URLSearchParams('page=2&limit=20')
      const result = getPaginationParams(params)

      expect(result).toEqual({
        page: 2,
        limit: 20,
        offset: 20,
      })
    })

    it('uses defaults when params are missing', () => {
      const params = new URLSearchParams('')
      const result = getPaginationParams(params)

      expect(result).toEqual({
        page: 1,
        limit: 12,
        offset: 0,
      })
    })

    it('calculates correct offset for page 1', () => {
      const params = new URLSearchParams('page=1&limit=10')
      const result = getPaginationParams(params)

      expect(result.offset).toBe(0)
    })

    it('calculates correct offset for page 3', () => {
      const params = new URLSearchParams('page=3&limit=10')
      const result = getPaginationParams(params)

      expect(result.offset).toBe(20)
    })

    it('handles invalid page number', () => {
      const params = new URLSearchParams('page=invalid')
      const result = getPaginationParams(params)

      expect(result.page).toBeNaN()
    })
  })

  describe('createPaginationResponse', () => {
    it('creates pagination metadata', () => {
      const result = createPaginationResponse(1, 10, 50)

      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
      })
    })

    it('calculates totalPages correctly with remainder', () => {
      const result = createPaginationResponse(1, 10, 55)

      expect(result.totalPages).toBe(6)
    })

    it('handles zero total', () => {
      const result = createPaginationResponse(1, 10, 0)

      expect(result.totalPages).toBe(0)
    })

    it('handles single page', () => {
      const result = createPaginationResponse(1, 10, 5)

      expect(result.totalPages).toBe(1)
    })

    it('handles exact page boundary', () => {
      const result = createPaginationResponse(1, 10, 30)

      expect(result.totalPages).toBe(3)
    })
  })

  describe('requireAuth', () => {
    it('returns user and supabase when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })

      const result = await requireAuth()

      expect(result).toHaveProperty('user', mockUser)
      expect(result).toHaveProperty('supabase')
    })

    it('returns 401 error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await requireAuth()

      expect(result).toHaveProperty('status', 401)
    })
  })

  describe('requireAdmin', () => {
    it('returns user, supabase, and profile when admin', async () => {
      const mockUser = { id: 'admin-123', email: 'admin@example.com' }
      const mockProfile = { role: 'admin' }

      mockGetUser.mockResolvedValue({ data: { user: mockUser } })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })

      const result = await requireAdmin()

      expect(result).toHaveProperty('user', mockUser)
      expect(result).toHaveProperty('profile', { role: 'admin' })
    })

    it('returns user when librarian role', async () => {
      const mockUser = { id: 'librarian-123', email: 'librarian@example.com' }
      const mockProfile = { role: 'librarian' }

      mockGetUser.mockResolvedValue({ data: { user: mockUser } })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })

      const result = await requireAdmin()

      expect(result).toHaveProperty('user', mockUser)
      expect(result).toHaveProperty('profile', { role: 'librarian' })
    })

    it('returns 401 error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await requireAdmin()

      expect(result).toHaveProperty('status', 401)
    })

    it('returns 403 error when not admin role', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' }
      const mockProfile = { role: 'member' }

      mockGetUser.mockResolvedValue({ data: { user: mockUser } })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })

      const result = await requireAdmin()

      expect(result).toHaveProperty('status', 403)
    })

    it('returns 403 error when profile not found', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' }

      mockGetUser.mockResolvedValue({ data: { user: mockUser } })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })

      const result = await requireAdmin()

      expect(result).toHaveProperty('status', 403)
    })
  })

  describe('isErrorResponse', () => {
    it('returns true for NextResponse', () => {
      const response = jsonError('Error', 400)

      expect(isErrorResponse(response)).toBe(true)
    })

    it('returns false for plain object', () => {
      const result = { user: { id: '123' }, supabase: {} }

      expect(isErrorResponse(result)).toBe(false)
    })

    it('returns false for null', () => {
      expect(isErrorResponse(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isErrorResponse(undefined)).toBe(false)
    })

    it('returns false for string', () => {
      expect(isErrorResponse('error')).toBe(false)
    })
  })
})
