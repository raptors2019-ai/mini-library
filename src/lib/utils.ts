import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Estimates reading time based on page count
 * Assumes average reading speed of 45 pages per hour
 */
export function estimateReadingTime(pageCount: number | null): string | null {
  if (!pageCount || pageCount <= 0) return null

  const hours = pageCount / 45
  if (hours < 1) return "< 1 hr"
  if (hours < 2) return "~1 hr"
  return `~${Math.round(hours)} hrs`
}

/**
 * Formats a number with K/M suffix for large numbers
 * e.g., 1234 -> "1.2K", 1234567 -> "1.2M"
 */
export function formatCount(count: number | null): string {
  if (!count) return "0"
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toString()
}

/**
 * Strips HTML tags from a string
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>\s*<p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Truncates text to a maximum length, breaking at word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength) + '…'
}

/**
 * Formats a date string as a relative time (e.g., "2d ago", "3mo ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

/**
 * Gets initials from a name (first and last initial)
 */
export function getInitials(name: string | null, fallback: string | null = null): string {
  const displayName = name || fallback || 'A'
  const parts = displayName.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return displayName.slice(0, 2).toUpperCase()
}
