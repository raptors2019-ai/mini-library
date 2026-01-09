'use client'

import { useEffect, useState } from 'react'
import { Star, MessageSquare, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

interface Review {
  id: string
  rating: number | null
  review: string | null
  created_at: string
  updated_at: string
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface ReviewStats {
  totalRatings: number
  averageRating: number
  reviewCount: number
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
}

interface BookReviewsProps {
  bookId: string
}

interface StarRatingProps {
  rating: number
  size?: 'sm' | 'md'
}

function getStarClassName(star: number, rating: number): string {
  if (star <= rating) {
    return 'fill-yellow-500 text-yellow-500'
  }
  if (star - 0.5 <= rating) {
    return 'fill-yellow-500/50 text-yellow-500'
  }
  return 'text-muted-foreground/30'
}

function StarRating({ rating, size = 'md' }: StarRatingProps): React.ReactElement {
  const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-5 w-5'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${getStarClassName(star, rating)}`}
        />
      ))}
    </div>
  )
}

export function BookReviews({ bookId }: BookReviewsProps): React.ReactElement {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews(): Promise<void> {
      try {
        const response = await fetch(`/api/books/${bookId}/reviews?limit=10`)
        if (response.ok) {
          const data = await response.json()
          setReviews(data.reviews || [])
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [bookId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-4 w-4" />
            Ratings & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats || stats.totalRatings === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-4 w-4" />
            Ratings & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No ratings yet</p>
          <p className="text-sm mt-1">Be the first to rate this book!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-4 w-4" />
          Ratings & Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="flex gap-6 flex-wrap">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-4xl font-bold">{stats.averageRating}</div>
            <StarRating rating={stats.averageRating} />
            <p className="text-sm text-muted-foreground mt-1">
              {stats.totalRatings} {stats.totalRatings === 1 ? 'rating' : 'ratings'}
            </p>
          </div>

          {/* Distribution */}
          <div className="flex-1 min-w-48 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star as 1 | 2 | 3 | 4 | 5]
              const percentage = stats.totalRatings > 0
                ? (count / stats.totalRatings) * 100
                : 0
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-muted-foreground">{star}</span>
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="w-8 text-right text-muted-foreground text-xs">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Reviews List */}
        {reviews.filter(r => r.review).length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Reviews ({stats.reviewCount})
            </h4>
            {reviews
              .filter(r => r.review)
              .map((review) => (
                <div key={review.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={review.user?.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {review.user?.full_name || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating || 0} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-11">
                    {review.review}
                  </p>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
