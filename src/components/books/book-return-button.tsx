'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReturnDialog } from '@/components/dashboard/return-dialog'
import { RotateCcw } from 'lucide-react'
import type { CheckoutWithBook } from '@/types/database'

interface BookReturnButtonProps {
  checkout: CheckoutWithBook
  currentDate?: Date
}

export function BookReturnButton({ checkout, currentDate }: BookReturnButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => setDialogOpen(true)}
      >
        <RotateCcw className="h-4 w-4" />
        Return Book
      </Button>

      <ReturnDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        checkout={checkout}
        currentDate={currentDate}
      />
    </>
  )
}
