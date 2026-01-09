"use client"

import { useState, useRef, useCallback } from "react"
import { TrendingUp } from "lucide-react"
import { TrendingBookCard } from "./trending-book-card"
import type { BookStatus } from "@/types/database"

interface TrendingBook {
  id: string
  title: string
  author: string
  cover_url: string | null
  status: BookStatus
}

interface TrendingCarouselProps {
  books: TrendingBook[]
}

export function TrendingCarousel({ books }: TrendingCarouselProps) {
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
    <section className="py-12 w-full min-w-0 overflow-hidden">
      {/* Section Header */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Trending Now</h2>
          <p className="text-sm text-muted-foreground">Popular picks from our collection</p>
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
            <TrendingBookCard
              key={`${book.id}-${index}`}
              id={book.id}
              title={book.title}
              author={book.author}
              coverUrl={book.cover_url}
              status={book.status}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
