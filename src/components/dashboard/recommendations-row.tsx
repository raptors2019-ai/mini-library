'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BookCoverImage } from '@/components/books/book-cover-image'
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
        const response = await fetch('/api/recommendations?limit=6')
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
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-3 w-2/3 mt-1" />
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommended For You
          </CardTitle>
          <Link href="/books">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
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
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="flex-shrink-0 w-32 group"
            >
              <div className="aspect-[2/3] relative bg-muted rounded-lg overflow-hidden">
                <BookCoverImage
                  src={book.cover_url}
                  alt={book.title}
                  iconSize="sm"
                  className="transition-transform group-hover:scale-105"
                />
                <Badge
                  className={`absolute top-1 right-1 text-xs ${
                    book.status === 'available'
                      ? 'bg-green-500 text-white'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {book.status === 'available' ? 'Available' : 'Checked Out'}
                </Badge>
              </div>
              <h4 className="text-sm font-medium mt-2 line-clamp-2 group-hover:text-primary transition-colors">
                {book.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {book.author}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
