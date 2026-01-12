'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookCarouselCard } from './book-carousel-card'
import type { Book } from '@/types/database'

interface SimilarBooksProps {
  bookId: string
  limit?: number
}

export function SimilarBooks({ bookId, limit = 5 }: SimilarBooksProps): React.ReactElement | null {
  const [books, setBooks] = useState<Book[]>([])
  const [similarityType, setSimilarityType] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSimilar(): Promise<void> {
      try {
        const response = await fetch(`/api/books/${bookId}/similar?limit=${limit}`)
        if (response.ok) {
          const data = await response.json()
          setBooks(data.books || [])
          setSimilarityType(data.similarity_type || '')
        }
      } catch (error) {
        console.error('Failed to fetch similar books:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSimilar()
  }, [bookId, limit])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Similar Books
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[180px] space-y-2 animate-pulse">
                <div className="aspect-[2/3] bg-muted rounded-lg" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (books.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Similar Books
          </CardTitle>
          {similarityType === 'semantic' && (
            <Badge variant="secondary" className="text-xs">AI-powered</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {books.map((book) => (
            <BookCarouselCard
              key={book.id}
              id={book.id}
              title={book.title}
              author={book.author}
              coverUrl={book.cover_url}
              status={book.status}
              genres={book.genres}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
