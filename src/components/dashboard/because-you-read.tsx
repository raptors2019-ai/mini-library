'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookCoverImage } from '@/components/books/book-cover-image'
import { BookCarouselCard } from '@/components/books/book-carousel-card'
import type { BookStatus } from '@/types/database'

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
  status: BookStatus
  genres?: string[] | null
  ai_summary?: string | null
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
        const response = await fetch('/api/recommendations/because-you-read?limit=5')
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
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="flex-shrink-0 w-[180px] space-y-2 animate-pulse">
                    <div className="aspect-[2/3] bg-muted rounded-lg" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-8 bg-muted rounded-md" />
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {rec.similarBooks.map((book) => (
                <BookCarouselCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  coverUrl={book.cover_url}
                  status={book.status}
                  genres={book.genres}
                  showAiBadge={!!book.ai_summary}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
