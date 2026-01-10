'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookCheck } from 'lucide-react'
import { CheckoutDialog } from './checkout-dialog'

interface CheckoutButtonProps {
  bookId: string
  bookTitle: string
  bookAuthor: string
  disabled?: boolean
  loanDays?: number
  isPremium?: boolean
}

export function CheckoutButton({
  bookId,
  bookTitle,
  bookAuthor,
  disabled,
  loanDays,
  isPremium,
}: CheckoutButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button
        className="w-full"
        onClick={() => setDialogOpen(true)}
        disabled={disabled}
      >
        <BookCheck className="h-4 w-4 mr-2" />
        {disabled ? 'Checkout limit reached' : 'Checkout Book'}
      </Button>
      <CheckoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bookId={bookId}
        bookTitle={bookTitle}
        bookAuthor={bookAuthor}
        loanDays={loanDays}
        isPremium={isPremium}
      />
    </>
  )
}
