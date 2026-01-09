import type { BookStatus, UserRole } from '@/types/database'

export const BOOK_STATUS_COLORS: Record<BookStatus, string> = {
  available: 'bg-green-500/10 text-green-600 border-green-500/20',
  checked_out: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  on_hold: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  inactive: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  available: 'Available',
  checked_out: 'Checked Out',
  on_hold: 'On Hold',
  inactive: 'Inactive',
}

export const GENRES = [
  'Fiction',
  'Non-Fiction',
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
