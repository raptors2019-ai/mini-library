'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Loader2, Check, BookPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserBookStatus } from '@/types/database'

interface UserBookFormProps {
  bookId: string
  existingStatus?: UserBookStatus | null
  existingRating?: number | null
  existingReview?: string | null
}

const STATUS_OPTIONS: { value: UserBookStatus; label: string }[] = [
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'reading', label: 'Currently Reading' },
  { value: 'read', label: 'Read' },
  { value: 'dnf', label: 'Did Not Finish' },
]

interface SaveButtonContentProps {
  loading: boolean
  saved: boolean
  isUpdate: boolean
}

function SaveButtonContent({ loading, saved, isUpdate }: SaveButtonContentProps): React.ReactElement {
  if (loading) {
    return (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Saving...
      </>
    )
  }
  if (saved) {
    return (
      <>
        <Check className="h-4 w-4 mr-2" />
        Saved!
      </>
    )
  }
  return <>{isUpdate ? 'Update' : 'Add to My Books'}</>
}

export function UserBookForm({
  bookId,
  existingStatus,
  existingRating,
  existingReview,
}: UserBookFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState<UserBookStatus | ''>(existingStatus || '')
  const [rating, setRating] = useState<number>(existingRating || 0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [review, setReview] = useState(existingReview || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!status) return

    setLoading(true)
    setSaved(false)

    try {
      const response = await fetch('/api/user/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          status,
          rating: rating > 0 ? rating : null,
          review: review.trim() || null,
          date_finished: status === 'read' ? new Date().toISOString() : null,
        }),
      })

      if (response.ok) {
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <Card data-review-form>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookPlus className="h-4 w-4" />
          {existingStatus ? 'Your Reading Status' : 'Track This Book'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Select */}
        <div className="space-y-2">
          <Label>Reading Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as UserBookStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status..." />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <Label>Your Rating</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star === rating ? 0 : star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={`h-7 w-7 ${
                    star <= displayRating
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-muted-foreground/30 hover:text-yellow-500/50'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                {rating}/5
              </span>
            )}
          </div>
        </div>

        {/* Review */}
        <div className="space-y-2">
          <Label>Your Review (optional)</Label>
          <Textarea
            placeholder="What did you think of this book?"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!status || loading}
          className="w-full"
        >
          <SaveButtonContent loading={loading} saved={saved} isUpdate={!!existingStatus} />
        </Button>
      </CardContent>
    </Card>
  )
}
