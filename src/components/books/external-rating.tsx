'use client'

import { useEffect, useState } from 'react'
import { Star, ExternalLink, Users, MessageSquare, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  formatCount,
  stripHtml,
  truncateText,
  formatRelativeTime,
  getInitials,
} from '@/lib/utils'

interface HardcoverReview {
  review: string
  rating: number | null
  createdAt: string
  user: {
    username: string | null
    name: string | null
  }
}

interface ExternalMetadata {
  rating: number | null
  ratingsCount: number | null
  reviewsCount: number | null
  usersReadCount: number | null
  hardcoverUrl: string | null
  hardcoverSlug: string | null
  reviews: HardcoverReview[] | null
  previewLink: string | null
  publisher: string | null
}

interface ExternalRatingProps {
  bookId: string
  showReviews?: boolean
}

// Animated star fill for visual interest
function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const starSize = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(Math.max(rating - star + 1, 0), 1)
        return (
          <div key={star} className="relative">
            <Star className={`${starSize} text-muted-foreground/20`} />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className={`${starSize} fill-amber-400 text-amber-400`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ExternalRating({ bookId, showReviews = true }: ExternalRatingProps): React.ReactElement | null {
  const [metadata, setMetadata] = useState<ExternalMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [notAvailable, setNotAvailable] = useState(false)

  useEffect(() => {
    async function fetchMetadata(): Promise<void> {
      try {
        const response = await fetch(`/api/books/${bookId}/metadata`)
        if (response.ok) {
          const data = await response.json()
          if (data.metadata) {
            setMetadata(data.metadata)
          } else {
            setNotAvailable(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error)
        setNotAvailable(true)
      } finally {
        setLoading(false)
      }
    }
    fetchMetadata()
  }, [bookId])

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (notAvailable || (!metadata?.rating && !metadata?.previewLink)) {
    return null
  }

  const hasReviews = metadata.reviews && metadata.reviews.length > 0

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/50">
      {/* Decorative corner accent */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />

      <div className="relative p-6 lg:p-8">
        {/* Header with rating */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-5">
            {/* Large Rating Display */}
            {metadata.rating && (
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/20 dark:to-amber-600/10 shadow-sm">
                  <div className="text-center">
                    <div className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
                      {metadata.rating.toFixed(1)}
                    </div>
                  </div>
                </div>
                {/* Decorative ring */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400/20 to-transparent -z-10" />
              </div>
            )}

            <div className="space-y-1.5">
              {metadata.rating && <RatingStars rating={metadata.rating} size="lg" />}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {metadata.ratingsCount && (
                  <span>{formatCount(metadata.ratingsCount)} ratings</span>
                )}
                {metadata.reviewsCount ? (
                  <>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {formatCount(metadata.reviewsCount)}
                    </span>
                  </>
                ) : null}
                {metadata.usersReadCount ? (
                  <>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {formatCount(metadata.usersReadCount)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Hardcover attribution */}
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

        {/* Reviews Section */}
        {showReviews && hasReviews && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Reader Reviews
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
            </div>

            <div className="grid gap-4">
              {metadata.reviews!.slice(0, 3).map((review, index) => (
                <div
                  key={index}
                  className="group relative rounded-xl bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                >
                  {/* Large decorative quote */}
                  <div className="absolute top-2 left-3 text-5xl font-serif text-primary/10 select-none leading-none">
                    &ldquo;
                  </div>

                  <div className="relative pl-6">
                    <p className="text-sm leading-relaxed text-foreground/80 italic">
                      {truncateText(stripHtml(review.review), 180)}
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
          </div>
        )}

        {/* Action buttons and metadata */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {metadata.hardcoverUrl && (
              <Button
                variant="default"
                size="sm"
                className="rounded-full gap-2 shadow-sm"
                asChild
              >
                <a
                  href={metadata.hardcoverUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {hasReviews ? 'Read All Reviews' : 'View on Hardcover'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {metadata.previewLink && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                asChild
              >
                <a
                  href={metadata.previewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Preview
                </a>
              </Button>
            )}
          </div>

          {metadata.publisher && (
            <p className="text-xs text-muted-foreground">
              Published by <span className="font-medium">{metadata.publisher}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
