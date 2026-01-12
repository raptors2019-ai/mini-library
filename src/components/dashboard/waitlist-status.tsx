'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, BookOpen, PartyPopper, X, GripVertical, Crown, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { WaitlistWithBookAndEstimate } from '@/types/database'

interface WaitlistStatusProps {
  waitlistEntries: WaitlistWithBookAndEstimate[]
  isPriorityUser?: boolean
}

export function WaitlistStatus({ waitlistEntries, isPriorityUser = false }: WaitlistStatusProps) {
  const router = useRouter()
  const [localEntries, setLocalEntries] = useState(waitlistEntries)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const formatDaysRemaining = (days: number | null) => {
    if (days === null) return 'Unknown'
    if (days === 0) return 'Soon'
    if (days === 1) return '1 day'
    return `${days} days`
  }

  const handleRemove = useCallback(async (bookId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const response = await fetch(`/api/waitlist/${bookId}`, { method: 'DELETE' })
    if (response.ok) {
      setLocalEntries(prev => prev.filter(item => item.book_id !== bookId))
      router.refresh()
    }
  }, [router])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newList = [...localEntries]
    const [draggedItem] = newList.splice(draggedIndex, 1)
    newList.splice(index, 0, draggedItem)
    setLocalEntries(newList)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Your Waitlist
          </CardTitle>
          {localEntries.length > 0 && (
            <Badge variant="secondary">{localEntries.length} books</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {localEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Not waiting for any books</p>
            <Link href="/books">
              <Button variant="link" className="mt-2">Browse books</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {localEntries.map((entry, index) => {
              const isAvailable = entry.status === 'notified'
              return (
                <div
                  key={entry.id}
                  className={`flex gap-3 p-3 rounded-lg border bg-card transition-all ${
                    draggedIndex === index ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDragEnd}
                >
                  <div className="cursor-grab text-muted-foreground hover:text-foreground self-center">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <Link
                    href={`/books/${entry.book.id}`}
                    className="flex gap-3 flex-1 min-w-0"
                  >
                    <div className="w-12 h-18 relative bg-muted rounded overflow-hidden flex-shrink-0">
                      {entry.book.cover_url ? (
                        <Image
                          src={entry.book.cover_url}
                          alt={entry.book.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">
                        {entry.book.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {entry.book.author}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {isAvailable ? (
                          <Badge className="bg-green-500 text-white text-xs">
                            <PartyPopper className="h-3 w-3 mr-1" />
                            Available now!
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="outline" className="text-xs">
                              #{entry.position}
                            </Badge>
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDaysRemaining(entry.estimated_days)}
                            </Badge>
                          </>
                        )}
                      </div>
                      {isAvailable && entry.expires_at && (
                        <>
                          {isPriorityUser ? (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
                              <Crown className="h-3 w-3" />
                              <span>Early access! Claim before general release on {new Date(entry.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>Claim by {new Date(entry.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} or lose your spot</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 self-center shrink-0"
                    onClick={(e) => handleRemove(entry.book_id, e)}
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-1 text-xs">Leave</span>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
