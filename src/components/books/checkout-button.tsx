'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookCheck, LogIn } from 'lucide-react'
import { CheckoutDialog } from './checkout-dialog'

interface CheckoutButtonProps {
  bookId: string
  bookTitle: string
  bookAuthor: string
  disabled?: boolean
  loanDays?: number
  isPremium?: boolean
  overdueCount?: number
  isGuest?: boolean
}

export function CheckoutButton({
  bookId,
  bookTitle,
  bookAuthor,
  disabled,
  loanDays,
  isPremium,
  overdueCount = 0,
  isGuest = false,
}: CheckoutButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  // Block checkout if user has overdue books
  const hasOverdue = overdueCount > 0
  const isDisabled = disabled || hasOverdue || isGuest

  // Guest users need to login with a member account
  if (isGuest) {
    return (
      <Button asChild className="w-full" variant="secondary">
        <Link href="/login">
          <LogIn className="h-4 w-4 mr-2" />
          Login to checkout
        </Link>
      </Button>
    )
  }

  return (
    <>
      <Button
        className="w-full"
        onClick={() => setDialogOpen(true)}
        disabled={isDisabled}
        variant={hasOverdue ? 'destructive' : 'default'}
      >
        <BookCheck className="h-4 w-4 mr-2" />
        {hasOverdue
          ? 'Return overdue books first'
          : disabled
            ? 'Checkout limit reached'
            : 'Checkout Book'}
      </Button>
      <CheckoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bookId={bookId}
        bookTitle={bookTitle}
        bookAuthor={bookAuthor}
        loanDays={loanDays}
        isPremium={isPremium}
        overdueCount={overdueCount}
      />
    </>
  )
}
