"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BOOK_STATUS_LABELS } from "@/lib/constants"
import type { BookStatus } from "@/types/database"

interface TrendingBookCardProps {
  id: string
  title: string
  author: string
  coverUrl: string | null
  status: BookStatus
}

export function TrendingBookCard({
  id,
  title,
  author,
  coverUrl,
  status,
}: TrendingBookCardProps) {
  const [imageError, setImageError] = useState(false)
  const isAvailable = status === "available"
  const showPlaceholder = !coverUrl || imageError

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
        </div>
      </Link>

      <CardContent className="p-3">
        <Link href={`/books/${id}`}>
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1 hover:text-primary transition-colors">
            {title}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{author}</p>

        {renderActionButton()}
      </CardContent>
    </Card>
  )
}
