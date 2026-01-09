import {
  isAdminRole,
  isPriorityRole,
  BOOK_STATUS_COLORS,
  BOOK_STATUS_LABELS,
  ADMIN_ROLES,
  PRIORITY_ROLES,
  GENRES
} from './constants'

describe('isAdminRole', () => {
  it('should return true for admin role', () => {
    expect(isAdminRole('admin')).toBe(true)
  })

  it('should return true for librarian role', () => {
    expect(isAdminRole('librarian')).toBe(true)
  })

  it('should return false for member role', () => {
    expect(isAdminRole('member')).toBe(false)
  })

  it('should return false for premium role', () => {
    expect(isAdminRole('premium')).toBe(false)
  })

  it('should return false for guest role', () => {
    expect(isAdminRole('guest')).toBe(false)
  })

  it('should return false for null', () => {
    expect(isAdminRole(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isAdminRole(undefined)).toBe(false)
  })
})

describe('isPriorityRole', () => {
  it('should return true for admin role', () => {
    expect(isPriorityRole('admin')).toBe(true)
  })

  it('should return true for librarian role', () => {
    expect(isPriorityRole('librarian')).toBe(true)
  })

  it('should return true for premium role', () => {
    expect(isPriorityRole('premium')).toBe(true)
  })

  it('should return false for member role', () => {
    expect(isPriorityRole('member')).toBe(false)
  })

  it('should return false for guest role', () => {
    expect(isPriorityRole('guest')).toBe(false)
  })

  it('should return false for null', () => {
    expect(isPriorityRole(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isPriorityRole(undefined)).toBe(false)
  })
})

describe('BOOK_STATUS_COLORS', () => {
  it('should have colors for all statuses', () => {
    expect(BOOK_STATUS_COLORS.available).toBeDefined()
    expect(BOOK_STATUS_COLORS.checked_out).toBeDefined()
    expect(BOOK_STATUS_COLORS.on_hold).toBeDefined()
    expect(BOOK_STATUS_COLORS.inactive).toBeDefined()
  })
})

describe('BOOK_STATUS_LABELS', () => {
  it('should have labels for all statuses', () => {
    expect(BOOK_STATUS_LABELS.available).toBe('Available')
    expect(BOOK_STATUS_LABELS.checked_out).toBe('Checked Out')
    expect(BOOK_STATUS_LABELS.on_hold).toBe('On Hold')
    expect(BOOK_STATUS_LABELS.inactive).toBe('Inactive')
  })
})

describe('Role arrays', () => {
  it('should have correct admin roles', () => {
    expect(ADMIN_ROLES).toContain('admin')
    expect(ADMIN_ROLES).toContain('librarian')
    expect(ADMIN_ROLES).not.toContain('member')
  })

  it('should have correct priority roles', () => {
    expect(PRIORITY_ROLES).toContain('admin')
    expect(PRIORITY_ROLES).toContain('librarian')
    expect(PRIORITY_ROLES).toContain('premium')
    expect(PRIORITY_ROLES).not.toContain('member')
  })
})

describe('GENRES', () => {
  it('should have multiple genres', () => {
    expect(GENRES.length).toBeGreaterThan(10)
  })

  it('should include common genres', () => {
    expect(GENRES).toContain('Fiction')
    expect(GENRES).toContain('Non-Fiction')
    expect(GENRES).toContain('Science Fiction')
    expect(GENRES).toContain('Mystery')
  })
})
