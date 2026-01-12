import {
  isAdminRole,
  isPriorityRole,
  isPremiumRole,
  getHoldDurationHours,
  BOOK_STATUS_COLORS,
  BOOK_STATUS_LABELS,
  CHECKOUT_STATUS_COLORS,
  CHECKOUT_STATUS_LABELS,
  CHECKOUT_LIMITS,
  HOLD_DURATION,
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

describe('CHECKOUT_STATUS_COLORS', () => {
  it('should have colors for all checkout statuses', () => {
    expect(CHECKOUT_STATUS_COLORS.active).toBeDefined()
    expect(CHECKOUT_STATUS_COLORS.overdue).toBeDefined()
    expect(CHECKOUT_STATUS_COLORS.returned).toBeDefined()
  })

  it('should have proper color classes', () => {
    expect(CHECKOUT_STATUS_COLORS.active).toContain('green')
    expect(CHECKOUT_STATUS_COLORS.overdue).toContain('red')
    expect(CHECKOUT_STATUS_COLORS.returned).toContain('gray')
  })
})

describe('CHECKOUT_STATUS_LABELS', () => {
  it('should have labels for all checkout statuses', () => {
    expect(CHECKOUT_STATUS_LABELS.active).toBe('Active')
    expect(CHECKOUT_STATUS_LABELS.overdue).toBe('Overdue')
    expect(CHECKOUT_STATUS_LABELS.returned).toBe('Returned')
  })
})

describe('CHECKOUT_LIMITS', () => {
  it('should have standard tier limits', () => {
    expect(CHECKOUT_LIMITS.standard.maxBooks).toBe(2)
    expect(CHECKOUT_LIMITS.standard.loanDays).toBe(14)
    expect(CHECKOUT_LIMITS.standard.lateFeePerDay).toBe(0.25)
  })

  it('should have premium tier limits', () => {
    expect(CHECKOUT_LIMITS.premium.maxBooks).toBe(5)
    expect(CHECKOUT_LIMITS.premium.loanDays).toBe(17)
    expect(CHECKOUT_LIMITS.premium.lateFeePerDay).toBe(0.25)
  })

  it('should give premium more books than standard', () => {
    expect(CHECKOUT_LIMITS.premium.maxBooks).toBeGreaterThan(CHECKOUT_LIMITS.standard.maxBooks)
  })
})

describe('HOLD_DURATION', () => {
  it('should have standard hold duration', () => {
    expect(HOLD_DURATION.standard).toBe(24)
  })

  it('should have premium hold duration', () => {
    expect(HOLD_DURATION.premium).toBe(48)
  })

  it('should give premium longer hold time', () => {
    expect(HOLD_DURATION.premium).toBeGreaterThan(HOLD_DURATION.standard)
  })
})

describe('getHoldDurationHours', () => {
  it('should return premium duration for admin', () => {
    expect(getHoldDurationHours('admin')).toBe(48)
  })

  it('should return premium duration for librarian', () => {
    expect(getHoldDurationHours('librarian')).toBe(48)
  })

  it('should return premium duration for premium role', () => {
    expect(getHoldDurationHours('premium')).toBe(48)
  })

  it('should return standard duration for member', () => {
    expect(getHoldDurationHours('member')).toBe(24)
  })

  it('should return standard duration for guest', () => {
    expect(getHoldDurationHours('guest')).toBe(24)
  })

  it('should return standard duration for null', () => {
    expect(getHoldDurationHours(null)).toBe(24)
  })

  it('should return standard duration for undefined', () => {
    expect(getHoldDurationHours(undefined)).toBe(24)
  })
})

describe('isPremiumRole', () => {
  it('should return true for admin role', () => {
    expect(isPremiumRole('admin')).toBe(true)
  })

  it('should return true for librarian role', () => {
    expect(isPremiumRole('librarian')).toBe(true)
  })

  it('should return true for premium role', () => {
    expect(isPremiumRole('premium')).toBe(true)
  })

  it('should return false for member role', () => {
    expect(isPremiumRole('member')).toBe(false)
  })

  it('should return false for guest role', () => {
    expect(isPremiumRole('guest')).toBe(false)
  })

  it('should return false for null', () => {
    expect(isPremiumRole(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isPremiumRole(undefined)).toBe(false)
  })
})
