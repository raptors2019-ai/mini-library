'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookPlus, Check, Loader2, Star, Clock, BookMarked, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserBookStatus } from '@/types/database'

interface AddToMyBooksButtonProps {
  bookId: string
  existingStatus?: UserBookStatus | null
  existingRating?: number | null
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
}

const STATUS_LABELS: Record<UserBookStatus, string> = {
  want_to_read: 'Want to Read',
  reading: 'Currently Reading',
  read: 'Read',
  dnf: 'Did Not Finish',
}

const STATUS_ICONS: Record<UserBookStatus, React.ReactNode> = {
  want_to_read: <Clock className="h-4 w-4 text-amber-500" />,
  reading: <BookMarked className="h-4 w-4 text-blue-500" />,
  read: <Check className="h-4 w-4 text-green-500" />,
  dnf: <span className="text-xs">🚫</span>,
}

export function AddToMyBooksButton({
  bookId,
  existingStatus,
  existingRating,
  variant = 'outline',
  size = 'default',
  showLabel = true,
}: AddToMyBooksButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<UserBookStatus | null>(existingStatus || null)
  const [rating, setRating] = useState<number | null>(existingRating || null)

  const handleStatusChange = async (newStatus: UserBookStatus) => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          status: newStatus,
          date_finished: newStatus === 'read' ? new Date().toISOString() : null,
        }),
      })

      if (response.ok) {
        setStatus(newStatus)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update book status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRating = async (newRating: number) => {
    setLoading(true)
    try {
      // First ensure the book is in the user's list
      await fetch('/api/user/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          status: status || 'read',
          rating: newRating,
          date_finished: status === 'read' || !status ? new Date().toISOString() : null,
        }),
      })

      setRating(newRating)
      if (!status) setStatus('read')
      router.refresh()
    } catch (error) {
      console.error('Failed to rate book:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/user/books?book_id=${bookId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setStatus(null)
        setRating(null)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to remove book:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <Button variant={variant} size={size} disabled className="w-full">
        <Loader2 className="h-4 w-4 animate-spin" />
        {showLabel && <span className="ml-2">Saving...</span>}
      </Button>
    )
  }

  // If not added yet, show two simple button options
  if (!status) {
    return (
      <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          size={size}
          className="flex-1 gap-2"
          onClick={() => handleStatusChange('want_to_read')}
        >
          <Clock className="h-4 w-4 text-amber-500" />
          Want to Read
        </Button>
        <Button
          variant="outline"
          size={size}
          className="flex-1 gap-2"
          onClick={() => handleStatusChange('reading')}
        >
          <BookMarked className="h-4 w-4 text-blue-500" />
          Reading
        </Button>
      </div>
    )
  }

  // Once added, show dropdown to change status
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size={size} className="w-full gap-2">
          {STATUS_ICONS[status]}
          {showLabel && <span>{STATUS_LABELS[status]}</span>}
          <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Change Status</DropdownMenuLabel>
        {(['want_to_read', 'reading', 'read', 'dnf'] as UserBookStatus[]).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => handleStatusChange(s)}
            className="cursor-pointer gap-2"
          >
            {STATUS_ICONS[s]}
            {STATUS_LABELS[s]}
            {status === s && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground mb-2">Rate this book</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className="p-0.5 hover:scale-110 transition-transform"
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= (rating || 0)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-muted-foreground/30 hover:text-yellow-500/50'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleRemove}
          className="cursor-pointer text-destructive"
        >
          Remove from My Books
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
