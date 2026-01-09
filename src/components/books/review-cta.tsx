'use client'

import { MessageSquarePlus, Star, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ReviewCTAProps {
  reviewCount: number
  hasUserReview: boolean
  isLoggedIn: boolean
}

export function ReviewCTA({ reviewCount, hasUserReview, isLoggedIn }: ReviewCTAProps) {
  // Don't show if user already reviewed
  if (hasUserReview) return null

  const scrollToReviewForm = () => {
    // Scroll to the review form section
    const reviewForm = document.querySelector('[data-review-form]')
    if (reviewForm) {
      reviewForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Add a highlight effect
      reviewForm.classList.add('ring-2', 'ring-primary', 'ring-offset-2')
      setTimeout(() => {
        reviewForm.classList.remove('ring-2', 'ring-primary', 'ring-offset-2')
      }, 2000)
    }
  }

  // "Be the first" messaging when no reviews
  if (reviewCount === 0) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Be the first to review!</p>
                <p className="text-sm text-muted-foreground">
                  Share your thoughts and help others discover this book
                </p>
              </div>
            </div>
            {isLoggedIn ? (
              <Button onClick={scrollToReviewForm} size="sm" className="shrink-0">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Write Review
              </Button>
            ) : (
              <Button asChild size="sm" className="shrink-0">
                <a href="/login">Sign in to Review</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Encourage more reviews when few exist
  if (reviewCount < 5) {
    return (
      <Card className="bg-muted/30 border-muted">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium">Share your opinion</p>
                <p className="text-sm text-muted-foreground">
                  Only {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'} so far - add yours!
                </p>
              </div>
            </div>
            {isLoggedIn ? (
              <Button variant="outline" onClick={scrollToReviewForm} size="sm" className="shrink-0">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Add Review
              </Button>
            ) : (
              <Button variant="outline" asChild size="sm" className="shrink-0">
                <a href="/login">Sign in to Review</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Don't show CTA if there are already many reviews
  return null
}
