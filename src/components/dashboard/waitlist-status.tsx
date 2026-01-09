'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Clock, BookOpen, PartyPopper, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { WaitlistWithBook } from '@/types/database'

interface WaitlistStatusProps {
  waitlistEntries: WaitlistWithBook[]
}

export function WaitlistStatus({ waitlistEntries }: WaitlistStatusProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Your Waitlist
          </CardTitle>
          {waitlistEntries.length > 0 && (
            <Badge variant="secondary">{waitlistEntries.length} books</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {waitlistEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Not waiting for any books</p>
            <Link href="/books">
              <Button variant="link" className="mt-2">Browse books</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {waitlistEntries.map((entry) => {
              const isAvailable = entry.status === 'notified'
              return (
                <Link
                  key={entry.id}
                  href={`/books/${entry.book.id}`}
                  className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
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
                        <Badge variant="outline" className="text-xs">
                          Position #{entry.position}
                        </Badge>
                      )}
                    </div>
                    {isAvailable && entry.expires_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Claim by {new Date(entry.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
