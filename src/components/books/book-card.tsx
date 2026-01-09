'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Book } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

interface BookCardProps {
  book: Book
}

const statusColors: Record<string, string> = {
  available: 'bg-green-500/10 text-green-600 border-green-500/20',
  checked_out: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  on_hold: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  inactive: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}

const statusLabels: Record<string, string> = {
  available: 'Available',
  checked_out: 'Checked Out',
  on_hold: 'On Hold',
  inactive: 'Inactive'
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
            <Badge variant="outline" className={statusColors[book.status]}>
              {statusLabels[book.status]}
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
