'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, BookCheck, Clock, Star, ChevronDown, ChevronUp, X, GripVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UserBookWithBook, CheckoutWithBook, WaitlistWithBookAndEstimate } from '@/types/database'

interface StatsCardsProps {
  booksRead: number
  activeCheckouts: number
  checkoutLimit: number
  waitlistCount: number
  booksRated: number
  booksReadList: UserBookWithBook[]
  booksRatedList: UserBookWithBook[]
  checkoutsList: CheckoutWithBook[]
  waitlistList: WaitlistWithBookAndEstimate[]
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

function BookListItem({
  book,
  rating,
  review,
  subtitle
}: {
  book: { id: string; title: string; author: string; cover_url: string | null }
  rating?: number | null
  review?: string | null
  subtitle?: string
}) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
    >
      <Avatar className="h-10 w-10 rounded-sm shrink-0">
        <AvatarImage src={book.cover_url || undefined} alt={book.title} className="object-cover" />
        <AvatarFallback className="rounded-sm text-xs">
          {book.title.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{book.title}</p>
        <p className="text-xs text-muted-foreground truncate">{book.author}</p>
        {rating && (
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={rating} />
            {review && (
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                &ldquo;{review}&rdquo;
              </p>
            )}
          </div>
        )}
        {subtitle && !rating && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </Link>
  )
}

function WaitlistItem({
  entry,
  onRemove,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: {
  entry: WaitlistWithBookAndEstimate
  onRemove: (bookId: string) => void
  isDragging?: boolean
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  onDrop?: () => void
}) {
  const formatDaysRemaining = (days: number | null) => {
    if (days === null) return 'Unknown'
    if (days === 0) return 'Soon'
    if (days === 1) return '1 day'
    return `${days} days`
  }

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md border transition-all ${
        isDragging ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
      }`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
    >
      <div className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <Link
        href={`/books/${entry.book.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <Avatar className="h-10 w-10 rounded-sm shrink-0">
          <AvatarImage src={entry.book.cover_url || undefined} alt={entry.book.title} className="object-cover" />
          <AvatarFallback className="rounded-sm text-xs">
            {entry.book.title.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{entry.book.title}</p>
          <p className="text-xs text-muted-foreground truncate">{entry.book.author}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          #{entry.position}
        </Badge>
        <Badge variant="secondary" className="text-xs whitespace-nowrap bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          <Clock className="h-3 w-3 mr-1" />
          {formatDaysRemaining(entry.estimated_days)}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove(entry.book_id)
          }}
        >
          <X className="h-4 w-4" />
          <span className="ml-1 text-xs">Leave</span>
        </Button>
      </div>
    </div>
  )
}

export function StatsCards({
  booksRead,
  activeCheckouts,
  checkoutLimit,
  waitlistCount,
  booksRated,
  booksReadList,
  booksRatedList,
  checkoutsList,
  waitlistList,
}: StatsCardsProps) {
  const router = useRouter()
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [localWaitlist, setLocalWaitlist] = useState(waitlistList)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [removingBookId, setRemovingBookId] = useState<string | null>(null)

  const toggleCard = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  const handleRemoveFromWaitlist = useCallback(async (bookId: string) => {
    setRemovingBookId(bookId)
    try {
      const response = await fetch(`/api/waitlist/${bookId}`, { method: 'DELETE' })
      if (response.ok) {
        setLocalWaitlist(prev => prev.filter(item => item.book_id !== bookId))
        router.refresh()
      }
    } finally {
      setRemovingBookId(null)
    }
  }, [router])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newList = [...localWaitlist]
    const [draggedItem] = newList.splice(draggedIndex, 1)
    newList.splice(index, 0, draggedItem)
    setLocalWaitlist(newList)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    // Note: In a real app, you'd save the new order to the backend here
  }

  const stats = [
    {
      id: 'read',
      label: 'Books Read',
      value: booksRead,
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      items: booksReadList,
      emptyMessage: 'No books read yet',
    },
    {
      id: 'borrowed',
      label: 'Currently Borrowed',
      value: `${activeCheckouts}/${checkoutLimit}`,
      icon: BookCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      items: checkoutsList,
      emptyMessage: 'No active checkouts',
    },
    {
      id: 'waitlist',
      label: 'On Waitlist',
      value: localWaitlist.length,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      items: localWaitlist,
      emptyMessage: 'Not on any waitlists',
    },
    {
      id: 'rated',
      label: 'Books Rated',
      value: booksRated,
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      items: booksRatedList,
      emptyMessage: 'No books rated yet',
    },
  ]

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    return `Due in ${diffDays} days`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const isExpanded = expandedCard === stat.id
          const hasItems = stat.items.length > 0

          return (
            <Card
              key={stat.id}
              className={`cursor-pointer transition-all ${
                hasItems ? 'hover:ring-2 hover:ring-primary/20' : 'opacity-75'
              } ${isExpanded ? 'ring-2 ring-primary/30' : ''}`}
              onClick={() => hasItems && toggleCard(stat.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  {hasItems && (
                    <div className="text-muted-foreground">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Expanded Content */}
      {expandedCard && (
        <Card className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                {stats.find(s => s.id === expandedCard)?.label}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {stats.find(s => s.id === expandedCard)?.items.length} items
              </Badge>
            </div>
            <div className="grid gap-1 max-h-[300px] overflow-y-auto">
              {expandedCard === 'read' && booksReadList.map((item) => (
                <BookListItem
                  key={item.id}
                  book={item.book}
                  subtitle={item.date_finished ? `Finished ${new Date(item.date_finished).toLocaleDateString()}` : undefined}
                />
              ))}
              {expandedCard === 'borrowed' && checkoutsList.map((item) => (
                <BookListItem
                  key={item.id}
                  book={item.book}
                  subtitle={formatDueDate(item.due_date)}
                />
              ))}
              {expandedCard === 'waitlist' && localWaitlist.map((item, index) => (
                <WaitlistItem
                  key={item.id}
                  entry={item}
                  onRemove={handleRemoveFromWaitlist}
                  isDragging={draggedIndex === index}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDragEnd}
                />
              ))}
              {expandedCard === 'rated' && booksRatedList.map((item) => (
                <BookListItem
                  key={item.id}
                  book={item.book}
                  rating={item.rating}
                  review={item.review}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
