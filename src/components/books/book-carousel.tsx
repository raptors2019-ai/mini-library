"use client"

import { useState, useRef, useCallback } from "react"
import { TrendingUp, Star, Sparkles } from "lucide-react"
import { BookCarouselCard } from "./book-carousel-card"
import type { BookStatus } from "@/types/database"

export interface CarouselBook {
  id: string
  title: string
  author: string
  cover_url: string | null
  status: BookStatus
  genres?: string[] | null
  average_rating?: number | null
  rating_count?: number
  has_ai_summary?: boolean
}

type IconType = "trending" | "star" | "sparkles"

const ICONS = {
  trending: TrendingUp,
  star: Star,
  sparkles: Sparkles,
} as const

interface BookCarouselProps {
  books: CarouselBook[]
  title: string
  subtitle: string
  icon: IconType
  showRating?: boolean
  showAiBadge?: boolean
}

export function BookCarousel({
  books,
  title,
  subtitle,
  icon,
  showRating = false,
  showAiBadge = false
}: BookCarouselProps) {
  const Icon = ICONS[icon]
  const [isPaused, setIsPaused] = useState(false)
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Touch handlers for mobile - pause on touch, resume after delay
  const handleTouchStart = useCallback(() => {
    // Clear any pending resume timeout
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
      touchTimeoutRef.current = null
    }
    setIsPaused(true)
  }, [])

  const handleTouchEnd = useCallback(() => {
    // Resume carousel after 3 seconds to allow user to tap on cards
    touchTimeoutRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 3000)
  }, [])

  if (books.length === 0) {
    return null
  }

  // Duplicate books for infinite scroll effect
  const duplicatedBooks = [...books, ...books]

  return (
    <section className="py-8 w-full min-w-0 overflow-hidden">
      {/* Section Header */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Carousel Container */}
      <div
        className="relative w-full overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Gradient Overlays */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />

        {/* Scrolling Track */}
        <div
          className={`flex gap-4 px-4 w-fit carousel-animate ${isPaused ? 'carousel-paused' : ''}`}
        >
          {duplicatedBooks.map((book, index) => (
            <BookCarouselCard
              key={`${book.id}-${index}`}
              id={book.id}
              title={book.title}
              author={book.author}
              coverUrl={book.cover_url}
              status={book.status}
              genres={book.genres}
              averageRating={showRating ? book.average_rating : undefined}
              ratingCount={showRating ? book.rating_count : undefined}
              showAiBadge={showAiBadge && book.has_ai_summary}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
