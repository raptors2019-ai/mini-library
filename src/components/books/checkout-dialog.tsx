'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, BookCheck, Calendar, AlertTriangle, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { CHECKOUT_LIMITS } from '@/lib/constants'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookId: string
  bookTitle: string
  bookAuthor: string
  loanDays?: number
  isPremium?: boolean
  overdueCount?: number
}

export function CheckoutDialog({
  open,
  onOpenChange,
  bookId,
  bookTitle,
  bookAuthor,
  loanDays,
  isPremium = false,
  overdueCount = 0,
}: CheckoutDialogProps) {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const router = useRouter()

  // Use user's actual loan period, or defaults based on premium status
  const userLoanDays = loanDays ?? (isPremium ? CHECKOUT_LIMITS.premium.loanDays : CHECKOUT_LIMITS.standard.loanDays)
  const lateFeePerDay = isPremium ? CHECKOUT_LIMITS.premium.lateFeePerDay : CHECKOUT_LIMITS.standard.lateFeePerDay

  const calculateDueDate = () => {
    const due = new Date()
    due.setDate(due.getDate() + userLoanDays)
    return due
  }

  const handleCheckout = async () => {
    if (!agreed) return

    setLoading(true)
    try {
      const response = await fetch('/api/checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to checkout')
      }

      const data = await response.json()
      setDueDate(new Date(data.due_date))
      setSuccess(true)
      toast.success('Book checked out successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to checkout')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (success) {
      router.refresh()
    }
    setAgreed(false)
    setSuccess(false)
    setDueDate(null)
    onOpenChange(false)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Success state - show celebration
  if (success && dueDate) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          {/* Celebratory background animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-green-400/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse delay-75" />
          </div>

          <DialogHeader className="relative">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300">
              <BookCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center text-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              You got it! 🎉
            </DialogTitle>
            <DialogDescription className="text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-75">
              Enjoy your reading!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 relative animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 p-4 shadow-sm">
              <p className="font-semibold text-green-800 dark:text-green-200 line-clamp-2">
                {bookTitle}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                by {bookAuthor}
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Return by</p>
                <p className="text-lg font-bold text-foreground">
                  {formatDate(dueDate)}
                </p>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              We&apos;ll remind you before the due date. Happy reading!
            </p>
          </div>

          <DialogFooter className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-200">
            <Button onClick={handleClose} className="w-full" size="lg">
              Start Reading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Blocked state - user has overdue books
  if (overdueCount > 0) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-center">Cannot Checkout</DialogTitle>
            <DialogDescription className="text-center">
              You have overdue books that need to be returned first.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                {overdueCount} overdue {overdueCount === 1 ? 'book' : 'books'}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Please return your overdue books and pay any outstanding late fees before checking out new titles.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button onClick={handleClose} variant="outline" className="w-full">
              Close
            </Button>
            <Button
              onClick={() => {
                handleClose()
                window.location.href = '/dashboard'
              }}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Initial state - show terms
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Checkout Book</DialogTitle>
          <DialogDescription>
            Review our checkout policy before proceeding.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Premium badge */}
          {isPremium && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800">
              <Crown className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Premium Member Benefits</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Extended {userLoanDays}-day loan period & up to {CHECKOUT_LIMITS.premium.maxBooks} books
                </p>
              </div>
            </div>
          )}

          {/* Book info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="font-medium line-clamp-2">{bookTitle}</p>
            <p className="text-sm text-muted-foreground">by {bookAuthor}</p>
          </div>

          {/* Return policy */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Return Policy
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
              <li>
                Loan period: <span className="font-medium text-foreground">{userLoanDays} days</span>
                {isPremium && <Badge variant="secondary" className="ml-2 text-xs">Premium</Badge>}
              </li>
              <li>
                Due date: <span className="font-medium text-foreground">{formatDate(calculateDueDate())}</span>
              </li>
            </ul>
          </div>

          {/* Late fee warning */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Late Return Penalty
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  A fee of <span className="font-semibold">${lateFeePerDay.toFixed(2)} per day</span> will
                  be charged for late returns. Please return your book on time!
                </p>
              </div>
            </div>
          </div>

          {/* Agreement checkbox */}
          <div className="flex items-start space-x-3 pt-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <Label
              htmlFor="agree"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I understand and agree to the checkout policy, including the {userLoanDays}-day
              return period and late fee penalties.
            </Label>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={!agreed || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <BookCheck className="h-4 w-4 mr-2" />
                Confirm Checkout
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
