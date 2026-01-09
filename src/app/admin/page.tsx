'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings, Book, Users, Clock, AlertTriangle, Plus, BookOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Stats {
  books: {
    total: number
    available: number
    checked_out: number
  }
  users: {
    total: number
  }
  checkouts: {
    active: number
    overdue: number
  }
  waitlist: {
    total: number
  }
  recent_checkouts: Array<{
    id: string
    due_date: string
    book: { title: string; cover_url: string | null }
    user: { full_name: string | null; email: string }
  }>
  recent_books: Array<{
    id: string
    title: string
    author: string
    status: string
  }>
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total Books',
      value: stats?.books.total || 0,
      description: `${stats?.books.available || 0} available`,
      icon: Book,
      color: 'text-blue-600',
    },
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      description: 'Registered members',
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Active Checkouts',
      value: stats?.checkouts.active || 0,
      description: 'Currently borrowed',
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'Overdue',
      value: stats?.checkouts.overdue || 0,
      description: 'Need attention',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <Button asChild>
          <Link href="/admin/books/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Checkouts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Checkouts</CardTitle>
            <CardDescription>Latest borrowing activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recent_checkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent checkouts</p>
            ) : (
              <div className="space-y-3">
                {stats?.recent_checkouts.map((checkout) => (
                  <div key={checkout.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{checkout.book?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {checkout.user?.full_name || checkout.user?.email}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Due {new Date(checkout.due_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Books */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Added Books</CardTitle>
            <CardDescription>Latest additions to the library</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recent_books.length === 0 ? (
              <p className="text-sm text-muted-foreground">No books yet</p>
            ) : (
              <div className="space-y-3">
                {stats?.recent_books.map((book) => (
                  <div key={book.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      <Book className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                    </div>
                    <Badge variant={book.status === 'available' ? 'default' : 'secondary'}>
                      {book.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/books">Manage Books</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/checkouts">View All Checkouts</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/users">Manage Users</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
