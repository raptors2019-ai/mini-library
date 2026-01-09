'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookCoverImage } from '@/components/books/book-cover-image'

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
                <Link
                  key={book.id}
                  href={`/books/${book.id}`}
                  className="group space-y-2"
                >
                  <div className="aspect-[2/3] relative bg-muted rounded-lg overflow-hidden">
                    <BookCoverImage
                      src={book.cover_url}
                      alt={book.title}
                      className="group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {book.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {book.author}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
