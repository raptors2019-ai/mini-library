'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BOOK_STATUS_COLORS, BOOK_STATUS_LABELS } from '@/lib/constants'
import type { Book } from '@/types/database'

interface ChatBookCardProps {
  book: Book
}

function CompactStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(Math.max(rating - star + 1, 0), 1)
        return (
          <div key={star} className="relative">
            <Star className="h-2.5 w-2.5 text-muted-foreground/20" />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            </div>
          </div>
        )
      })}
      <span className="ml-0.5 text-xs text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

export function ChatBookCard({ book }: ChatBookCardProps) {
  const [rating, setRating] = useState<number | null>(null)

  useEffect(() => {
    async function fetchRating() {
      try {
        const response = await fetch(`/api/books/${book.id}/metadata`)
        if (response.ok) {
          const data = await response.json()
          if (data.metadata?.rating) {
            setRating(data.metadata.rating)
          }
        }
      } catch {
        // Silently fail - rating is optional
      }
    }
    fetchRating()
  }, [book.id])

  return (
    <Link
      href={`/books/${book.id}`}
      className="flex gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      {/* Cover */}
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-muted">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover"
            sizes="44px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground p-1 text-center leading-tight">
            {book.title.slice(0, 20)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{book.title}</h4>
        <p className="text-xs text-muted-foreground truncate">{book.author}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs px-1.5 py-0 ${BOOK_STATUS_COLORS[book.status]}`}
          >
            {BOOK_STATUS_LABELS[book.status]}
          </Badge>
          {rating && <CompactStars rating={rating} />}
        </div>
      </div>
    </Link>
  )
}
