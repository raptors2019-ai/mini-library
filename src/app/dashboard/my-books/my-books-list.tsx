'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Star, MoreVertical, Trash2, Edit } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserBookWithBook } from '@/types/database'

interface MyBooksListProps {
  userBooks: UserBookWithBook[]
  emptyMessage: string
}

export function MyBooksList({ userBooks, emptyMessage }: MyBooksListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/user/books/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpdateRating = async (id: string, rating: number) => {
    await fetch(`/api/user/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    })
    router.refresh()
  }

  if (userBooks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
          <Link href="/books">
            <Button variant="link" className="mt-2">Browse books to add</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {userBooks.map((userBook) => (
        <Card key={userBook.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Cover */}
              <Link href={`/books/${userBook.book.id}`} className="flex-shrink-0">
                <div className="w-16 h-24 relative bg-muted rounded overflow-hidden">
                  {userBook.book.cover_url ? (
                    <Image
                      src={userBook.book.cover_url}
                      alt={userBook.book.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </Link>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link href={`/books/${userBook.book.id}`}>
                  <h3 className="font-semibold line-clamp-1 hover:text-primary transition-colors">
                    {userBook.book.title}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {userBook.book.author}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleUpdateRating(userBook.id, star)}
                      className="p-0.5 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          star <= (userBook.rating || 0)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-muted-foreground/30 hover:text-yellow-500/50'
                        }`}
                      />
                    </button>
                  ))}
                  {userBook.rating && (
                    <span className="text-sm text-muted-foreground ml-2">
                      {userBook.rating}/5
                    </span>
                  )}
                </div>

                {/* Genres */}
                {userBook.book.genres && userBook.book.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {userBook.book.genres.slice(0, 3).map(genre => (
                      <Badge key={genre} variant="secondary" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Date */}
                {userBook.date_finished && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Finished: {new Date(userBook.date_finished).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/books/${userBook.book.id}`}>
                      <Edit className="h-4 w-4 mr-2" />
                      View Book
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(userBook.id)}
                    disabled={deletingId === userBook.id}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletingId === userBook.id ? 'Removing...' : 'Remove'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Review */}
            {userBook.review && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  &ldquo;{userBook.review}&rdquo;
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
