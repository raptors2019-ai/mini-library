'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, BookCheck, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { BookCoverImage } from '@/components/books/book-cover-image'
import type { UserBookWithBook } from '@/types/database'

interface StatsCardsProps {
  booksRead: number
  activeCheckouts: number
  checkoutLimit: number
  waitlistCount: number
  booksRated: number
  booksReadList?: UserBookWithBook[]
  booksRatedList?: UserBookWithBook[]
}

export function StatsCards({
  booksRead,
  activeCheckouts,
  checkoutLimit,
  waitlistCount,
  booksRated,
  booksReadList = [],
  booksRatedList = [],
}: StatsCardsProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const stats = [
    {
      id: 'borrowed',
      label: 'Currently Borrowed',
      value: `${activeCheckouts}/${checkoutLimit}`,
      icon: BookCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      expandable: false,
    },
    {
      id: 'waitlist',
      label: 'On Waitlist',
      value: waitlistCount,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      expandable: false,
    },
    {
      id: 'rated',
      label: 'Books Rated',
      value: booksRated,
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      expandable: true,
      books: booksRatedList,
    },
    {
      id: 'read',
      label: 'Books Read',
      value: booksRead,
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      expandable: true,
      books: booksReadList,
    },
  ]

  const toggleExpand = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.id}
            className={stat.expandable ? 'cursor-pointer transition-colors hover:bg-muted/50' : ''}
            onClick={() => stat.expandable && toggleExpand(stat.id)}
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
                {stat.expandable && (
                  <div className="text-muted-foreground">
                    {expandedCard === stat.id ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expanded Content */}
      {expandedCard && (
        <Card>
          <CardContent className="p-4">
            {stats.find(s => s.id === expandedCard)?.books?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No books yet. Start tracking your reading!
              </p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {stats.find(s => s.id === expandedCard)?.books?.slice(0, 10).map((userBook) => (
                  <Link
                    key={userBook.id}
                    href={`/books/${userBook.book.id}`}
                    className="flex-shrink-0 w-[100px] group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-muted">
                      <BookCoverImage
                        src={userBook.book.cover_url}
                        alt={userBook.book.title}
                        className="group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="text-xs font-medium mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {userBook.book.title}
                    </p>
                    {expandedCard === 'rated' && userBook.rating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-xs text-muted-foreground">{userBook.rating}/5</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
            {(stats.find(s => s.id === expandedCard)?.books?.length || 0) > 10 && (
              <div className="text-center mt-2">
                <Link
                  href="/dashboard/my-books"
                  className="text-sm text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View all →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
