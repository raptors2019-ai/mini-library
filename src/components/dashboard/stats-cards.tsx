'use client'

import { BookOpen, BookCheck, Clock, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StatsCardsProps {
  booksRead: number
  activeCheckouts: number
  checkoutLimit: number
  waitlistCount: number
  booksRated: number
}

export function StatsCards({
  booksRead,
  activeCheckouts,
  checkoutLimit,
  waitlistCount,
  booksRated,
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Books Read',
      value: booksRead,
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Currently Borrowed',
      value: `${activeCheckouts}/${checkoutLimit}`,
      icon: BookCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'On Waitlist',
      value: waitlistCount,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Books Rated',
      value: booksRated,
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
