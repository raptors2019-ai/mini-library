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
import { Loader2, BookOpen, ThumbsUp, ThumbsDown, PartyPopper, BookMarked } from 'lucide-react'
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

type ReturnStep = 'confirm' | 'processing' | 'success' | 'question'

export function ReturnDialog({
  open,
  onOpenChange,
  checkout,
  onReturnComplete,
  currentDate = new Date(),
}: ReturnDialogProps) {
  const [step, setStep] = useState<ReturnStep>('confirm')
  const [loading, setLoading] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const router = useRouter()

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep('confirm')
      setShowConfetti(false)
    }
  }, [open])

  const handleReturn = async () => {
    if (!checkout) return

    setStep('processing')
    setLoading(true)

    try {
      const response = await fetch(`/api/checkouts/${checkout.id}/return`, {
        method: 'PUT',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to return book')
      }

      // Show success with confetti
      setStep('success')
      setShowConfetti(true)

      // After a moment, ask about completion
      setTimeout(() => {
        setStep('question')
      }, 2000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to return book')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const handleFinishedBook = async (finished: boolean) => {
    if (!checkout) return

    setLoading(true)

    try {
      if (finished) {
        // Mark book as "read" in user_books
        const response = await fetch('/api/user/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            book_id: checkout.book.id,
            status: 'read',
            date_finished: new Date().toISOString(),
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update reading status')
        }

        toast.success('Book added to your reading history!')
      } else {
        toast.success('Book returned successfully!')
      }

      router.refresh()
      onReturnComplete?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!checkout) return null

  const book = checkout.book

  return (
    <>
      <Confetti active={showConfetti} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {/* Confirm step */}
          {step === 'confirm' && (() => {
            const { daysOverdue, lateFee } = calculateLateFee(checkout.due_date, currentDate)
            return (
            <>
              <DialogHeader>
                <DialogTitle>Return Book</DialogTitle>
                <DialogDescription>
                  {daysOverdue > 0
                    ? `This book is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.`
                    : 'Confirm you want to return this book.'}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-4 py-4">
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
                    <div className="mt-3 p-2 bg-red-500/10 rounded-md border border-red-500/20">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Late Fee: ${lateFee.toFixed(2)}
                      </p>
                      <p className="text-xs text-red-500/80 mt-0.5">
                        ${LATE_FEE_PER_DAY.toFixed(2)}/day × {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleReturn}>
                  {lateFee > 0 ? `Return & Pay $${lateFee.toFixed(2)}` : 'Confirm Return'}
                </Button>
              </DialogFooter>
            </>
          )})()}

          {/* Processing step */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Processing return...</p>
            </div>
          )}

          {/* Success step */}
          {step === 'success' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative">
                <PartyPopper className="h-16 w-16 text-primary mb-4" />
                <span className="absolute -top-1 -right-1 text-2xl">🎉</span>
              </div>
              <h3 className="text-2xl font-bold text-primary mb-2">
                Book Returned!
              </h3>
              <p className="text-muted-foreground">
                Thank you for returning the book on time!
              </p>
            </div>
          )}

          {/* Question step */}
          {step === 'question' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5" />
                  Did you finish the book?
                </DialogTitle>
                <DialogDescription>
                  Help us track your reading progress!
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-4 py-4">
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
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleFinishedBook(false)}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ThumbsDown className="h-4 w-4 mr-2" />
                  )}
                  No, didn&apos;t finish
                </Button>
                <Button
                  onClick={() => handleFinishedBook(true)}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-4 w-4 mr-2" />
                  )}
                  Yes, I finished it!
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
