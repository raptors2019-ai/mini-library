"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BOOK_STATUS_LABELS } from "@/lib/constants"
import type { BookStatus } from "@/types/database"

interface BookCarouselCardProps {
  id: string
  title: string
  author: string
  coverUrl: string | null
  status: BookStatus
  genres?: string[] | null
  averageRating?: number | null
  ratingCount?: number
}

export function BookCarouselCard({
  id,
  title,
  author,
  coverUrl,
  status,
  genres,
  averageRating,
  ratingCount,
}: BookCarouselCardProps) {
  const [imageError, setImageError] = useState(false)
  const isAvailable = status === "available"
  const showPlaceholder = !coverUrl || imageError
  const primaryGenre = genres && genres.length > 0 ? genres[0] : null

  function renderActionButton() {
    if (isAvailable) {
      return (
        <Button size="sm" className="w-full text-xs h-8" asChild>
          <Link href={`/books/${id}`}>View Details</Link>
        </Button>
      )
    }

    return (
      <Button size="sm" variant="outline" className="w-full text-xs h-8" asChild>
        <Link href={`/books/${id}`}>Join Waitlist</Link>
      </Button>
    )
  }

  return (
    <Card className="group flex-shrink-0 w-[180px] sm:w-[200px] overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <Link href={`/books/${id}`}>
        {/* Book Cover */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
          {!showPlaceholder ? (
            <Image
              src={coverUrl!}
              alt={`Cover of ${title}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="200px"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}

          {/* Status Badge */}
          <Badge
            className={`absolute right-2 top-2 ${
              isAvailable
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-orange-500 text-white hover:bg-orange-600"
            }`}
          >
            {BOOK_STATUS_LABELS[status]}
          </Badge>

          {/* Genre Badge */}
          {primaryGenre && (
            <Badge
              variant="secondary"
              className="absolute left-2 top-2 text-xs bg-background/80 backdrop-blur-sm"
            >
              {primaryGenre}
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="p-3 flex flex-col h-[130px]">
        <Link href={`/books/${id}`}>
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1 hover:text-primary transition-colors">
            {title}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{author}</p>

        {/* Rating Display */}
        {averageRating !== undefined && averageRating !== null && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium">{averageRating.toFixed(1)}</span>
            {ratingCount !== undefined && ratingCount > 0 && (
              <span className="text-xs text-muted-foreground">({ratingCount})</span>
            )}
          </div>
        )}

        <div className="mt-auto">
          {renderActionButton()}
        </div>
      </CardContent>
    </Card>
  )
}
