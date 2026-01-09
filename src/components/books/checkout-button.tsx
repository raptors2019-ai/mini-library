'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, BookCheck } from 'lucide-react'
import { toast } from 'sonner'

interface CheckoutButtonProps {
  bookId: string
  disabled?: boolean
}

export function CheckoutButton({ bookId, disabled }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to checkout')
      }

      toast.success('Book checked out successfully!')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      className="w-full"
      onClick={handleCheckout}
      disabled={disabled || loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <BookCheck className="h-4 w-4 mr-2" />
      )}
      {disabled ? 'Checkout limit reached' : 'Checkout Book'}
    </Button>
  )
}
