'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Calendar, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ReturnDialog } from './return-dialog'
import type { CheckoutWithBook } from '@/types/database'

interface CurrentCheckoutsProps {
  checkouts: CheckoutWithBook[]
  checkoutLimit?: number
  onReturnComplete?: () => void
}

const LATE_FEE_PER_DAY = 0.25

function getDueStatus(dueDate: string, currentDate: Date): { label: string; color: string; urgent: boolean; daysOverdue: number; lateFee: number } {
  const due = new Date(dueDate)
  const daysUntilDue = Math.ceil((due.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilDue < 0) {
    const daysOverdue = Math.abs(daysUntilDue)
    const lateFee = daysOverdue * LATE_FEE_PER_DAY
    return { label: `${daysOverdue}d overdue`, color: 'text-red-500 bg-red-500/10', urgent: true, daysOverdue, lateFee }
  } else if (daysUntilDue === 0) {
    return { label: 'Due today', color: 'text-red-500 bg-red-500/10', urgent: true, daysOverdue: 0, lateFee: 0 }
  } else if (daysUntilDue <= 2) {
    return { label: `${daysUntilDue}d left`, color: 'text-orange-500 bg-orange-500/10', urgent: true, daysOverdue: 0, lateFee: 0 }
  } else if (daysUntilDue <= 5) {
    return { label: `${daysUntilDue}d left`, color: 'text-yellow-500 bg-yellow-500/10', urgent: false, daysOverdue: 0, lateFee: 0 }
  } else {
    return { label: `${daysUntilDue}d left`, color: 'text-green-500 bg-green-500/10', urgent: false, daysOverdue: 0, lateFee: 0 }
  }
}

export function CurrentCheckouts({ checkouts, checkoutLimit, onReturnComplete }: CurrentCheckoutsProps) {
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithBook | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const isOverLimit = checkoutLimit !== undefined && checkouts.length > checkoutLimit
  const booksOverLimit = isOverLimit ? checkouts.length - checkoutLimit : 0

  // Fetch simulated date (if any), otherwise use real date
  const fetchCurrentDate = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/simulated-date')
      if (res.ok) {
        const data = await res.json()
        if (data.simulatedDate) {
          setCurrentDate(new Date(data.simulatedDate))
        } else {
          setCurrentDate(new Date())
        }
      }
    } catch {
      // Fall back to real date on error
      setCurrentDate(new Date())
    }
  }, [])

  useEffect(() => {
    fetchCurrentDate()
  }, [fetchCurrentDate])

  const openReturnDialog = (checkout: CheckoutWithBook) => {
    setSelectedCheckout(checkout)
    setDialogOpen(true)
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
        {/* Over limit warning */}
        {isOverLimit && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {checkouts.length} books checked out but your current limit is {checkoutLimit}.
              Please return {booksOverLimit} {booksOverLimit === 1 ? 'book' : 'books'} to checkout new titles.
            </AlertDescription>
          </Alert>
        )}

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
              const dueStatus = getDueStatus(checkout.due_date, currentDate)
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
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={dueStatus.color}>
                        {dueStatus.urgent && <AlertCircle className="h-3 w-3 mr-1" />}
                        <Calendar className="h-3 w-3 mr-1" />
                        {dueStatus.label}
                      </Badge>
                      {dueStatus.lateFee > 0 && (
                        <Badge variant="destructive">
                          Late fee: ${dueStatus.lateFee.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(checkout.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {dueStatus.daysOverdue > 0 && (
                      <p className="text-xs text-red-500 mt-1 font-medium">
                        ${LATE_FEE_PER_DAY.toFixed(2)}/day late fee applies
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReturnDialog(checkout)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Return
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      <ReturnDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        checkout={selectedCheckout}
        onReturnComplete={onReturnComplete}
        currentDate={currentDate}
      />
    </Card>
  )
}
