'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, ListPlus, ListX, Crown, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface WaitlistButtonProps {
  bookId: string
  isOnWaitlist: boolean
  waitlistPosition?: number
  isPriorityUser?: boolean
  totalWaiting?: number
  priorityWaiting?: number
}

export function WaitlistButton({
  bookId,
  isOnWaitlist,
  waitlistPosition,
  isPriorityUser = false,
  totalWaiting = 0,
  priorityWaiting = 0,
}: WaitlistButtonProps) {
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

  // Priority messaging for non-priority users
  const getPriorityMessage = () => {
    if (isPriorityUser) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
          <Crown className="h-3 w-3" />
          Premium priority access (48hr hold)
        </span>
      )
    }

    if (priorityWaiting > 0) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Clock className="h-3 w-3" />
          {priorityWaiting} premium {priorityWaiting === 1 ? 'member' : 'members'} ahead
        </span>
      )
    }

    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
        <Clock className="h-3 w-3" />
        24hr hold when available
      </span>
    )
  }

  return (
    <div className="space-y-1">
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
          : `Join Waitlist${totalWaiting > 0 ? ` (${totalWaiting} waiting)` : ''}`}
      </Button>
      {!isOnWaitlist && getPriorityMessage()}
    </div>
  )
}
