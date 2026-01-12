'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatBookCard } from './chat-book-card'
import type { Book } from '@/types/database'
import { cn } from '@/lib/utils'

interface ChatBookCarouselProps {
  books: Book[]
}

export function ChatBookCarousel({ books }: ChatBookCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!books.length) return null

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : books.length - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < books.length - 1 ? prev + 1 : 0))
  }

  const goToIndex = (index: number) => {
    setCurrentIndex(index)
  }

  // If only one book, show it without navigation
  if (books.length === 1) {
    return (
      <div className="w-full">
        <ChatBookCard book={books[0]} />
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Carousel container */}
      <div className="relative">
        {/* Book card */}
        <div className="px-8">
          <ChatBookCard book={books[currentIndex]} />
        </div>

        {/* Previous button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/80 hover:bg-background shadow-sm border"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous book</span>
        </Button>

        {/* Next button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/80 hover:bg-background shadow-sm border"
          onClick={goToNext}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next book</span>
        </Button>
      </div>

      {/* Position indicator and dots */}
      <div className="flex items-center justify-center gap-2 mt-2">
        {/* Dots navigation */}
        <div className="flex items-center gap-1">
          {books.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                currentIndex === index
                  ? 'w-4 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to book ${index + 1}`}
            />
          ))}
        </div>

        {/* Position text */}
        <span className="text-xs text-muted-foreground ml-2">
          {currentIndex + 1}/{books.length}
        </span>
      </div>
    </div>
  )
}
