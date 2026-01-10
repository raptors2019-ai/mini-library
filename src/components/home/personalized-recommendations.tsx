'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompactBookCard } from '@/components/books/compact-book-card'
import { AddToMyBooksButton } from '@/components/books/add-to-my-books-button'
import type { Book } from '@/types/database'

interface PersonalizedRecommendationsProps {
  favoriteGenres: string[]
}

export function PersonalizedRecommendations({ favoriteGenres }: PersonalizedRecommendationsProps): React.ReactElement | null {
  const [recommendations, setRecommendations] = useState<Book[]>([])
  const [recommendationType, setRecommendationType] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecommendations(): Promise<void> {
      try {
        const response = await fetch('/api/recommendations?limit=6&type=for-you')
        if (response.ok) {
          const data = await response.json()
          setRecommendations(data.recommendations || [])
          setRecommendationType(data.type || '')
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
      <section className="py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Recommended for You
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="aspect-[2/3] bg-muted rounded-lg" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Recommended for You
          </h2>
          <div className="flex items-center gap-2 mt-1">
            {recommendationType === 'personalized' && (
              <Badge variant="secondary" className="text-xs">Based on your taste</Badge>
            )}
            {recommendationType === 'genre-based' && favoriteGenres.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Based on {favoriteGenres.slice(0, 2).join(', ')}
              </Badge>
            )}
          </div>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            View all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {recommendations.map((book) => (
          <div key={book.id} className="space-y-2">
            <CompactBookCard
              id={book.id}
              title={book.title}
              author={book.author}
              coverUrl={book.cover_url}
            />
            <AddToMyBooksButton
              bookId={book.id}
              variant="ghost"
              size="sm"
              showLabel={false}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
