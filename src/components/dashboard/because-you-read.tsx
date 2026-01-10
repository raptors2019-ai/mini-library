'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookCoverImage } from '@/components/books/book-cover-image'
import { CompactBookCard } from '@/components/books/compact-book-card'

interface SourceBook {
  id: string
  title: string
  cover_url: string | null
  author: string
}

interface SimilarBook {
  id: string
  title: string
  cover_url: string | null
  author: string
  similarity?: number
}

interface Recommendation {
  sourceBook: SourceBook
  similarBooks: SimilarBook[]
}

export function BecauseYouRead(): React.ReactElement | null {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecommendations(): Promise<void> {
      try {
        const response = await fetch('/api/recommendations/because-you-read?limit=4')
        if (response.ok) {
          const data = await response.json()
          setRecommendations(data.recommendations || [])
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-64 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-2 animate-pulse">
                    <div className="aspect-[2/3] bg-muted rounded-lg" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {recommendations.map((rec) => (
        <Card key={rec.sourceBook.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Link href={`/books/${rec.sourceBook.id}`} className="flex-shrink-0">
                <div className="w-10 h-14 relative bg-muted rounded overflow-hidden">
                  <BookCoverImage
                    src={rec.sourceBook.cover_url}
                    alt={rec.sourceBook.title}
                    iconSize="sm"
                  />
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">
                    Because you loved <span className="text-primary">{rec.sourceBook.title}</span>
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground truncate">
                  by {rec.sourceBook.author}
                </p>
              </div>
              <Link
                href={`/books/${rec.sourceBook.id}`}
                className="hidden sm:flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                View book
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {rec.similarBooks.map((book) => (
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
      ))}
    </div>
  )
}
