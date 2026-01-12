import type { BookStatus, UserRole, CheckoutStatus } from '@/types/database'

export const BOOK_STATUS_COLORS: Record<BookStatus, string> = {
  available: 'bg-green-500/10 text-green-600 border-green-500/20',
  checked_out: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  on_hold_premium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  on_hold_waitlist: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  inactive: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  available: 'Available',
  checked_out: 'Checked Out',
  on_hold_premium: 'On Hold (Premium)',
  on_hold_waitlist: 'On Hold (Waitlist)',
  inactive: 'Inactive',
}

// Hold period durations in hours
export const WAITLIST_HOLD_DURATION = {
  premium: 24,   // 1 day for premium members to claim
  waitlist: 24,  // 1 day for all waitlist members to claim
} as const

export const CHECKOUT_STATUS_COLORS: Record<CheckoutStatus, string> = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  overdue: 'bg-red-500/10 text-red-600 border-red-500/20',
  returned: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

export const CHECKOUT_STATUS_LABELS: Record<CheckoutStatus, string> = {
  active: 'Active',
  overdue: 'Overdue',
  returned: 'Returned',
}

export const GENRES = [
  'Fiction',
  'Mystery',
  'Science Fiction',
  'Fantasy',
  'Romance',
  'Thriller',
  'Biography',
  'History',
  'Self-Help',
  'Science',
  'Technology',
  'Business',
  'Health',
  'Wellness',
  'Children',
  'Young Adult',
] as const

export const ADMIN_ROLES: readonly UserRole[] = ['librarian', 'admin']

export const PRIORITY_ROLES: readonly UserRole[] = ['premium', 'librarian', 'admin']

export function isAdminRole(role: string | null | undefined): boolean {
  return role !== null && role !== undefined && (ADMIN_ROLES as readonly string[]).includes(role)
}

export function isPriorityRole(role: string | null | undefined): boolean {
  return role !== null && role !== undefined && (PRIORITY_ROLES as readonly string[]).includes(role)
}

// Checkout limits by tier
export const CHECKOUT_LIMITS = {
  standard: {
    maxBooks: 2,
    loanDays: 14,
    lateFeePerDay: 0.25,
  },
  premium: {
    maxBooks: 5,
    loanDays: 17,
    lateFeePerDay: 0.25,
  },
} as const

// Hold duration when book becomes available (in hours)
export const HOLD_DURATION = {
  standard: 24,  // 1 day for standard members
  premium: 48,   // 2 days for premium/librarian/admin
} as const

export function getHoldDurationHours(role: string | null | undefined): number {
  return isPriorityRole(role) ? HOLD_DURATION.premium : HOLD_DURATION.standard
}
