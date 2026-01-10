'use client'

import { useEffect, useState } from 'react'
import { Star, ExternalLink, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HardcoverReview {
  review: string
  rating: number | null
  createdAt: string
  user: {
    username: string | null
    name: string | null
  }
}

interface HardcoverMetadata {
  hardcoverUrl: string | null
  reviews: HardcoverReview[] | null
  reviewsCount: number | null
}

interface HardcoverReviewsProps {
  bookId: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>\s*<p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength) + '…'
}

function formatRelativeTime(dateString: string): string {
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

function getInitials(name: string | null, username: string | null): string {
  const displayName = name || username || 'A'
  const parts = displayName.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return displayName.slice(0, 2).toUpperCase()
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(Math.max(rating - star + 1, 0), 1)
        return (
          <div key={star} className="relative">
            <Star className="h-3.5 w-3.5 text-muted-foreground/20" />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function HardcoverReviews({ bookId }: HardcoverReviewsProps): React.ReactElement {
  const [metadata, setMetadata] = useState<HardcoverMetadata | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetadata(): Promise<void> {
      try {
        const response = await fetch(`/api/books/${bookId}/metadata`)
        if (response.ok) {
          const data = await response.json()
          if (data.metadata) {
            setMetadata({
              hardcoverUrl: data.metadata.hardcoverUrl,
              reviews: data.metadata.reviews,
              reviewsCount: data.metadata.reviewsCount,
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMetadata()
  }, [bookId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-muted/30 p-4 space-y-3">
              <div className="h-16 rounded bg-muted" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const hasReviews = metadata?.reviews && metadata.reviews.length > 0

  if (!hasReviews) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground">No reviews available yet</p>
        {metadata?.hardcoverUrl && (
          <Button
            variant="link"
            size="sm"
            className="mt-2"
            asChild
          >
            <a
              href={metadata.hardcoverUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Be the first to review on Hardcover
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent w-12" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Reader Reviews
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent w-12" />
        </div>
        {metadata.hardcoverUrl && (
          <a
            href={metadata.hardcoverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="uppercase tracking-wider">via Hardcover</span>
            <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        )}
      </div>

      {/* Reviews List */}
      <div className="grid gap-4">
        {metadata.reviews!.map((review, index) => (
          <div
            key={index}
            className="group relative rounded-xl bg-muted/30 p-4 transition-colors hover:bg-muted/50"
          >
            {/* Large decorative quote */}
            <div className="absolute top-2 left-3 text-5xl font-serif text-primary/10 select-none leading-none">
              "
            </div>

            <div className="relative pl-6">
              <p className="text-sm leading-relaxed text-foreground/80 italic">
                {truncateText(stripHtml(review.review), 300)}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Avatar with initials */}
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(review.user.name, review.user.username)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {review.user.name || review.user.username || 'Anonymous'}
                    </span>
                    {review.rating && <RatingStars rating={review.rating} />}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(review.createdAt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View more on Hardcover */}
      {metadata.hardcoverUrl && (metadata.reviewsCount ?? 0) > (metadata.reviews?.length ?? 0) && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2"
            asChild
          >
            <a
              href={metadata.hardcoverUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View all {metadata.reviewsCount} reviews on Hardcover
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
