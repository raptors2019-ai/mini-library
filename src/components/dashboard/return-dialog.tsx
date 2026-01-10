'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Confetti } from '@/components/ui/confetti'
import { Loader2, BookOpen, ThumbsUp, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'
import type { CheckoutWithBook } from '@/types/database'

interface ReturnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checkout: CheckoutWithBook | null
  onReturnComplete?: () => void
  currentDate?: Date
}

const LATE_FEE_PER_DAY = 0.25

function calculateLateFee(dueDate: string, currentDate: Date): { daysOverdue: number; lateFee: number } {
  const due = new Date(dueDate)
  const daysUntilDue = Math.ceil((due.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilDue < 0) {
    const daysOverdue = Math.abs(daysUntilDue)
    return { daysOverdue, lateFee: daysOverdue * LATE_FEE_PER_DAY }
  }
  return { daysOverdue: 0, lateFee: 0 }
}

export function ReturnDialog({
  open,
  onOpenChange,
  checkout,
  onReturnComplete,
  currentDate = new Date(),
}: ReturnDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [finishedBook, setFinishedBook] = useState<boolean | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFinishedBook(null)
      setShowConfetti(false)
      setSuccess(false)
    }
  }, [open])

  const handleReturn = async () => {
    if (!checkout) return

    setLoading(true)

    try {
      const response = await fetch(`/api/checkouts/${checkout.id}/return`, {
        method: 'PUT',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to return book')
      }

      // If user finished the book, mark it as "read"
      if (finishedBook) {
        await fetch('/api/user/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            book_id: checkout.book.id,
            status: 'read',
            date_finished: new Date().toISOString(),
          }),
        })
      }

      // Show success briefly with confetti
      setSuccess(true)
      setShowConfetti(true)

      setTimeout(() => {
        toast.success(finishedBook ? 'Book returned & added to your reading history!' : 'Book returned successfully!')
        router.refresh()
        onReturnComplete?.()
        onOpenChange(false)
      }, 1500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to return book')
    } finally {
      setLoading(false)
    }
  }

  if (!checkout) return null

  const book = checkout.book
  const { daysOverdue, lateFee } = calculateLateFee(checkout.due_date, currentDate)

  // Success state - brief celebration
  if (success) {
    return (
      <>
        <Confetti active={showConfetti} />
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-primary mb-2">
                Book Returned!
              </h3>
              <p className="text-muted-foreground">
                {lateFee > 0
                  ? `Late fee of $${lateFee.toFixed(2)} recorded.`
                  : 'Thanks for returning on time!'}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Main return dialog - single screen
  return (
    <>
      <Confetti active={showConfetti} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Book</DialogTitle>
            <DialogDescription>
              {daysOverdue > 0
                ? `This book is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.`
                : 'Ready to return this book?'}
            </DialogDescription>
          </DialogHeader>

          {/* Book info */}
          <div className="flex gap-4 py-2">
            <div className="w-16 h-24 relative bg-muted rounded overflow-hidden flex-shrink-0">
              {book.cover_url ? (
                <Image
                  src={book.cover_url}
                  alt={book.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-2">{book.title}</p>
              <p className="text-sm text-muted-foreground">{book.author}</p>
              {lateFee > 0 && (
                <div className="mt-2 p-2 bg-red-500/10 rounded-md border border-red-500/20">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    Late Fee: ${lateFee.toFixed(2)}
                  </p>
                  <p className="text-xs text-red-500/80">
                    ${LATE_FEE_PER_DAY.toFixed(2)}/day × {daysOverdue} days
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Did you finish the book? */}
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">Did you finish the book?</p>
            <div className="flex gap-2">
              <Button
                variant={finishedBook === false ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFinishedBook(false)}
                disabled={loading}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                No
              </Button>
              <Button
                variant={finishedBook === true ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFinishedBook(true)}
                disabled={loading}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Yes
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              onClick={handleReturn}
              disabled={loading || finishedBook === null}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : lateFee > 0 ? (
                `Return & Pay $${lateFee.toFixed(2)}`
              ) : (
                'Return Book'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
