"use client"

import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export type BookStatus = "available" | "checked_out"

export interface BookCardProps {
  title: string
  author: string
  authorAvatar?: string
  coverImage?: string
  status: BookStatus
  onBorrow?: () => void
}

export function BookCard({ title, author, authorAvatar, coverImage, status, onBorrow }: BookCardProps) {
  const isAvailable = status === "available"

  return (
    <Card className="group w-full max-w-xs overflow-hidden rounded-xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-primary/5">
      {/* Book Cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        <Image
          src={coverImage || "/placeholder.svg?height=300&width=200&query=book cover"}
          alt={`Cover of ${title}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Status Badge */}
        <Badge
          variant={isAvailable ? "default" : "destructive"}
          className={`absolute right-2 top-2 ${
            isAvailable
              ? "bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              : "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          }`}
        >
          {isAvailable ? "Available" : "Checked Out"}
        </Badge>
      </div>

      <CardContent className="space-y-3 p-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground md:text-lg">{title}</h3>

        {/* Author */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 md:h-8 md:w-8">
            <AvatarImage src={authorAvatar || "/placeholder.svg"} alt={author} />
            <AvatarFallback className="text-xs">
              {author
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{author}</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          onClick={onBorrow}
          disabled={!isAvailable}
          className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          variant={isAvailable ? "default" : "secondary"}
        >
          {isAvailable ? "Borrow" : "Unavailable"}
        </Button>
      </CardFooter>
    </Card>
  )
}
