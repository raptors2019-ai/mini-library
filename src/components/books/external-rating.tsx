'use client'

import { useEffect, useState } from 'react'
import { Star, ExternalLink, Users, MessageSquare, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCount } from '@/lib/utils'

interface ExternalMetadata {
  // Hardcover data
  rating: number | null
  ratingsCount: number | null
  reviewsCount: number | null
  usersReadCount: number | null
  hardcoverUrl: string | null
  // Google Books data
  previewLink: string | null
  publisher: string | null
}

interface ExternalRatingProps {
  bookId: string
}

export function ExternalRating({ bookId }: ExternalRatingProps): React.ReactElement | null {
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
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show nothing if no useful external data
  if (notAvailable || (!metadata?.rating && !metadata?.previewLink)) {
    return null
  }

  const hasHardcoverData = metadata.rating || metadata.reviewsCount || metadata.usersReadCount

  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="py-4 space-y-3">
        {/* Hardcover Stats Row */}
        {hasHardcoverData && (
          <div className="flex flex-wrap items-center gap-4">
            {/* Star Rating */}
            {metadata.rating && (
              <div className="flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                <span className="text-lg font-semibold">{metadata.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">/5</span>
                {metadata.ratingsCount ? (
                  <span className="text-sm text-muted-foreground ml-1">
                    ({formatCount(metadata.ratingsCount)} ratings)
                  </span>
                ) : null}
              </div>
            )}

            {/* Reviews Count */}
            {metadata.reviewsCount ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                {formatCount(metadata.reviewsCount)} reviews
              </div>
            ) : null}

            {/* Readers Count */}
            {metadata.usersReadCount ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {formatCount(metadata.usersReadCount)} readers
              </div>
            ) : null}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hardcover Link */}
          {metadata.hardcoverUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={metadata.hardcoverUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View on Hardcover
              </a>
            </Button>
          )}

          {/* Google Books Preview Link */}
          {metadata.previewLink && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={metadata.previewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Read Preview
              </a>
            </Button>
          )}
        </div>

        {/* Publisher */}
        {metadata.publisher && (
          <p className="text-sm text-muted-foreground">
            Published by {metadata.publisher}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
