/**
 * Tests for simulated date utilities
 */

import {
  getSimulatedDate,
  getCurrentDate,
  setSimulatedDate,
  daysBetween,
  isOverdue,
  isDueSoon,
} from './simulated-date'

function createMockSupabase(data: unknown, error: unknown = null) {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data, error }),
        })),
      })),
    })),
  }
}

describe('simulated-date', () => {
  describe('daysBetween', () => {
    it('returns 0 for same date', () => {
      const date = new Date('2025-01-15')
      expect(daysBetween(date, date)).toBe(0)
    })

    it('returns positive number when date2 is after date1', () => {
      const date1 = new Date('2025-01-15')
      const date2 = new Date('2025-01-20')
      expect(daysBetween(date1, date2)).toBe(5)
    })

    it('returns negative number when date2 is before date1', () => {
      const date1 = new Date('2025-01-20')
      const date2 = new Date('2025-01-15')
      expect(daysBetween(date1, date2)).toBe(-5)
    })

    it('ignores time component', () => {
      const date1 = new Date('2025-01-15T08:00:00')
      const date2 = new Date('2025-01-15T23:59:59')
      expect(daysBetween(date1, date2)).toBe(0)
    })

    it('handles month boundaries', () => {
      const date1 = new Date('2025-01-30')
      const date2 = new Date('2025-02-05')
      expect(daysBetween(date1, date2)).toBe(6)
    })

    it('handles year boundaries', () => {
      const date1 = new Date('2024-12-31')
      const date2 = new Date('2025-01-01')
      expect(daysBetween(date1, date2)).toBe(1)
    })

    it('handles leap year', () => {
      const date1 = new Date('2024-02-28')
      const date2 = new Date('2024-03-01')
      expect(daysBetween(date1, date2)).toBe(2) // 2024 is leap year
    })
  })

  describe('isOverdue', () => {
    it('returns true when current date is after due date', () => {
      const dueDate = new Date('2025-01-15')
      const currentDate = new Date('2025-01-16')
      expect(isOverdue(dueDate, currentDate)).toBe(true)
    })

    it('returns false when current date is before due date', () => {
      const dueDate = new Date('2025-01-15')
      const currentDate = new Date('2025-01-14')
      expect(isOverdue(dueDate, currentDate)).toBe(false)
    })

    it('returns false when current date equals due date', () => {
      const dueDate = new Date('2025-01-15')
      const currentDate = new Date('2025-01-15')
      expect(isOverdue(dueDate, currentDate)).toBe(false)
    })

    it('returns true when significantly overdue', () => {
      const dueDate = new Date('2025-01-01')
      const currentDate = new Date('2025-01-31')
      expect(isOverdue(dueDate, currentDate)).toBe(true)
    })
  })

  describe('isDueSoon', () => {
    it('returns true when due today', () => {
      const dueDate = new Date('2025-01-15')
      const currentDate = new Date('2025-01-15')
      expect(isDueSoon(dueDate, currentDate)).toBe(true)
    })

    it('returns true when due within threshold', () => {
      const dueDate = new Date('2025-01-17')
      const currentDate = new Date('2025-01-15')
      expect(isDueSoon(dueDate, currentDate, 2)).toBe(true)
    })

    it('returns false when due date exceeds threshold', () => {
      const dueDate = new Date('2025-01-20')
      const currentDate = new Date('2025-01-15')
      expect(isDueSoon(dueDate, currentDate, 2)).toBe(false)
    })

    it('returns false when already overdue', () => {
      const dueDate = new Date('2025-01-10')
      const currentDate = new Date('2025-01-15')
      expect(isDueSoon(dueDate, currentDate)).toBe(false)
    })

    it('uses default threshold of 2 days', () => {
      const dueDate = new Date('2025-01-17')
      const currentDate = new Date('2025-01-15')
      expect(isDueSoon(dueDate, currentDate)).toBe(true)

      const farDueDate = new Date('2025-01-18')
      expect(isDueSoon(farDueDate, currentDate)).toBe(false)
    })

    it('handles custom threshold', () => {
      const dueDate = new Date('2025-01-20')
      const currentDate = new Date('2025-01-15')
      expect(isDueSoon(dueDate, currentDate, 5)).toBe(true)
      expect(isDueSoon(dueDate, currentDate, 4)).toBe(false)
    })
  })

  describe('getSimulatedDate', () => {
    it('returns null when no simulated date is set', async () => {
      const mockSupabase = createMockSupabase(null)
      const result = await getSimulatedDate(mockSupabase as never)
      expect(result).toBeNull()
    })

    it('returns null when value is null', async () => {
      const mockSupabase = createMockSupabase({ value: null })
      const result = await getSimulatedDate(mockSupabase as never)
      expect(result).toBeNull()
    })

    it('returns Date when valid ISO string is stored', async () => {
      const mockSupabase = createMockSupabase({ value: '2025-01-15T12:00:00.000Z' })
      const result = await getSimulatedDate(mockSupabase as never)
      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toBe('2025-01-15T12:00:00.000Z')
    })

    it('returns null for invalid date string', async () => {
      const mockSupabase = createMockSupabase({ value: 'invalid-date' })
      const result = await getSimulatedDate(mockSupabase as never)
      expect(result).toBeNull()
    })

    it('returns null for non-string value', async () => {
      const mockSupabase = createMockSupabase({ value: 12345 })
      const result = await getSimulatedDate(mockSupabase as never)
      expect(result).toBeNull()
    })
  })

  describe('getCurrentDate', () => {
    it('returns simulated date when set', async () => {
      const mockSupabase = createMockSupabase({ value: '2025-06-15T00:00:00.000Z' })
      const result = await getCurrentDate(mockSupabase as never)
      expect(result.toISOString()).toBe('2025-06-15T00:00:00.000Z')
    })

    it('returns real date when no simulation', async () => {
      const mockSupabase = createMockSupabase(null)
      const before = new Date()
      const result = await getCurrentDate(mockSupabase as never)
      const after = new Date()

      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('setSimulatedDate', () => {
    it('sets simulated date successfully', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      const mockSupabase = {
        from: jest.fn(() => ({
          upsert: mockUpsert,
        })),
      }

      const date = new Date('2025-03-15T10:00:00.000Z')
      const result = await setSimulatedDate(mockSupabase as never, date, 'user-123')

      expect(result).toEqual({ success: true })
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'simulated_date',
          value: '2025-03-15T10:00:00.000Z',
          updated_by: 'user-123',
        })
      )
    })

    it('resets simulated date when null is passed', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      const mockSupabase = {
        from: jest.fn(() => ({
          upsert: mockUpsert,
        })),
      }

      const result = await setSimulatedDate(mockSupabase as never, null, 'user-123')

      expect(result).toEqual({ success: true })
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'simulated_date',
          value: null,
          updated_by: 'user-123',
        })
      )
    })

    it('returns error on database failure', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })
      const mockSupabase = {
        from: jest.fn(() => ({
          upsert: mockUpsert,
        })),
      }

      const result = await setSimulatedDate(mockSupabase as never, new Date(), 'user-123')

      expect(result).toEqual({ success: false, error: 'Database error' })
    })
  })
})
