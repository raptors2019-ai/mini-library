'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookCoverImage } from './book-cover-image'
import { Badge } from '@/components/ui/badge'
import type { Book } from '@/types/database'

interface SimilarBooksProps {
  bookId: string
  limit?: number
}

interface CompactBookCardProps {
  id: string
  title: string
  author: string
  coverUrl: string | null
}

function CompactBookCard({ id, title, author, coverUrl }: CompactBookCardProps): React.ReactElement {
  return (
    <Link href={`/books/${id}`} className="group space-y-2">
      <div className="aspect-[2/3] relative bg-muted rounded-lg overflow-hidden">
        <BookCoverImage
          src={coverUrl}
          alt={title}
          className="group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <div>
        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-1">{author}</p>
      </div>
    </Link>
  )
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="aspect-[2/3] bg-muted rounded-lg" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {books.map((book) => (
            <CompactBookCard
              key={book.id}
              id={book.id}
              title={book.title}
              author={book.author}
              coverUrl={book.cover_url}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
