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
