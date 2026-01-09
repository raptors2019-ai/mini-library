'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, ListPlus, ListX } from 'lucide-react'
import { toast } from 'sonner'

interface WaitlistButtonProps {
  bookId: string
  isOnWaitlist: boolean
  waitlistPosition?: number
}

export function WaitlistButton({ bookId, isOnWaitlist, waitlistPosition }: WaitlistButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleWaitlist = async () => {
    setLoading(true)
    try {
      if (isOnWaitlist) {
        const response = await fetch(`/api/waitlist/${bookId}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to leave waitlist')
        }

        toast.success('Removed from waitlist')
      } else {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ book_id: bookId })
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to join waitlist')
        }

        toast.success('Added to waitlist!')
      }

      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={isOnWaitlist ? 'outline' : 'default'}
      className="w-full"
      onClick={handleWaitlist}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isOnWaitlist ? (
        <ListX className="h-4 w-4 mr-2" />
      ) : (
        <ListPlus className="h-4 w-4 mr-2" />
      )}
      {isOnWaitlist
        ? `Leave Waitlist (Position #${waitlistPosition})`
        : 'Join Waitlist'}
    </Button>
  )
}
