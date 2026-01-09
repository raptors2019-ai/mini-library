'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { CheckoutWithBook } from '@/types/database'

interface CurrentCheckoutsProps {
  checkouts: CheckoutWithBook[]
  onReturn?: (checkoutId: string) => Promise<void>
}

function getDueStatus(dueDate: string): { label: string; color: string; urgent: boolean } {
  const now = new Date()
  const due = new Date(dueDate)
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilDue < 0) {
    return { label: `${Math.abs(daysUntilDue)}d overdue`, color: 'text-red-500 bg-red-500/10', urgent: true }
  } else if (daysUntilDue === 0) {
    return { label: 'Due today', color: 'text-red-500 bg-red-500/10', urgent: true }
  } else if (daysUntilDue <= 2) {
    return { label: `${daysUntilDue}d left`, color: 'text-orange-500 bg-orange-500/10', urgent: true }
  } else if (daysUntilDue <= 5) {
    return { label: `${daysUntilDue}d left`, color: 'text-yellow-500 bg-yellow-500/10', urgent: false }
  } else {
    return { label: `${daysUntilDue}d left`, color: 'text-green-500 bg-green-500/10', urgent: false }
  }
}

export function CurrentCheckouts({ checkouts, onReturn }: CurrentCheckoutsProps) {
  const [returningId, setReturningId] = useState<string | null>(null)

  const handleReturn = async (checkoutId: string) => {
    if (!onReturn) return
    setReturningId(checkoutId)
    try {
      await onReturn(checkoutId)
    } finally {
      setReturningId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Current Checkouts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {checkouts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No books checked out</p>
            <Link href="/books">
              <Button variant="link" className="mt-2">Browse books</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {checkouts.map((checkout) => {
              const dueStatus = getDueStatus(checkout.due_date)
              return (
                <div
                  key={checkout.id}
                  className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="w-16 h-24 relative bg-muted rounded overflow-hidden flex-shrink-0">
                    {checkout.book.cover_url ? (
                      <Image
                        src={checkout.book.cover_url}
                        alt={checkout.book.title}
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
                    <Link href={`/books/${checkout.book.id}`}>
                      <h4 className="font-medium line-clamp-1 hover:text-primary transition-colors">
                        {checkout.book.title}
                      </h4>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {checkout.book.author}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={dueStatus.color}>
                        {dueStatus.urgent && <AlertCircle className="h-3 w-3 mr-1" />}
                        <Calendar className="h-3 w-3 mr-1" />
                        {dueStatus.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(checkout.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {onReturn && (
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReturn(checkout.id)}
                        disabled={returningId === checkout.id}
                      >
                        {returningId === checkout.id ? (
                          'Returning...'
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Return
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
