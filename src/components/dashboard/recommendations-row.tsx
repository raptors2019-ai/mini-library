'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BookCarouselCard } from '@/components/books/book-carousel-card'
import type { Book } from '@/types/database'

interface RecommendationsRowProps {
  onboardingCompleted: boolean
}

export function RecommendationsRow({ onboardingCompleted }: RecommendationsRowProps) {
  const [recommendations, setRecommendations] = useState<Book[]>([])
  const [basedOnGenres, setBasedOnGenres] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch('/api/recommendations?limit=5')
        if (response.ok) {
          const data = await response.json()
          setRecommendations(data.recommendations || [])
          setBasedOnGenres(data.basedOnGenres || [])
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recommended For You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[180px]">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-3 w-2/3 mt-1" />
                <Skeleton className="h-3 w-1/2 mt-1" />
                <Skeleton className="h-8 w-full mt-2 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended For You
        </CardTitle>
        {basedOnGenres.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Based on your interest in {basedOnGenres.slice(0, 3).join(', ')}
          </p>
        )}
        {!onboardingCompleted && (
          <p className="text-sm text-muted-foreground">
            <Link href="/onboarding" className="text-primary hover:underline">
              Complete your profile
            </Link>
            {' '}for better recommendations
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
          {recommendations.map((book) => (
            <BookCarouselCard
              key={book.id}
              id={book.id}
              title={book.title}
              author={book.author}
              coverUrl={book.cover_url}
              status={book.status}
              genres={book.genres}
              showAiBadge={false}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
