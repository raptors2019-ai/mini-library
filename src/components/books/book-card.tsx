'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Book } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'
import { BOOK_STATUS_COLORS, BOOK_STATUS_LABELS } from '@/lib/constants'

interface BookCardProps {
  book: Book
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/books/${book.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]">
        <div className="aspect-[2/3] relative bg-muted">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className={BOOK_STATUS_COLORS[book.status]}>
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
          {book.genres && book.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {book.genres.slice(0, 2).map((genre) => (
                <Badge key={genre} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {book.genres.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{book.genres.length - 2}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
