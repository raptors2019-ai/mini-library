'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Book, UserBookStatus } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'
import { BOOK_STATUS_LABELS } from '@/lib/constants'
import { AddToMyBooksButton } from './add-to-my-books-button'

interface BookCardProps {
  book: Book
  showAddButton?: boolean
  userBookStatus?: UserBookStatus | null
  userBookRating?: number | null
}

export function BookCard({ book, showAddButton = false, userBookStatus, userBookRating }: BookCardProps) {
  const [imageError, setImageError] = useState(false)
  const showPlaceholder = !book.cover_url || imageError

  return (
    <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] relative">
      <Link href={`/books/${book.id}`}>
        <div className="aspect-[2/3] relative bg-muted">
          {!showPlaceholder ? (
            <Image
              src={book.cover_url!}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
          {/* Genre Badge - top left */}
          {book.genres && book.genres.length > 0 && (
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="text-xs bg-background/80 backdrop-blur-sm shadow-sm"
              >
                {book.genres[0]}
              </Badge>
            </div>
          )}
          {/* Status Badge - top right */}
          <div className="absolute top-2 right-2">
            <Badge
              className={
                book.status === 'available'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                  : book.status === 'checked_out'
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                  : book.status === 'on_hold_premium'
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                  : book.status === 'on_hold_waitlist'
                  ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-sm'
                  : 'bg-gray-500 text-white hover:bg-gray-600 shadow-sm'
              }
            >
              {BOOK_STATUS_LABELS[book.status]}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {book.author}
          </p>
        </CardContent>
      </Link>
      {showAddButton && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <AddToMyBooksButton
            bookId={book.id}
            existingStatus={userBookStatus}
            existingRating={userBookRating}
            variant="secondary"
            size="icon"
            showLabel={false}
          />
        </div>
      )}
    </Card>
  )
}
