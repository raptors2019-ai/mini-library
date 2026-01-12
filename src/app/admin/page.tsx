'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings, Book, Users, Clock, AlertTriangle, Plus, BookOpen, BookPlus, Check, X, Pencil } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
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
  book_requests: {
    pending: number
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
  pending_requests: Array<{
    id: string
    title: string
    author: string
    isbn: string | null
    cover_url: string | null
    created_at: string
    user: { full_name: string | null; email: string; avatar_url: string | null }
  }>
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchStats = async () => {
    const response = await fetch('/api/admin/stats')
    if (response.ok) {
      const data = await response.json()
      setStats(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleApprove = async (requestId: string, title: string) => {
    setProcessingId(requestId)
    const response = await fetch(`/api/admin/book-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ createBook: true }),
    })
    if (response.ok) {
      toast.success(`"${title}" approved and added to library!`)
      fetchStats()
    } else {
      toast.error('Failed to approve request')
    }
    setProcessingId(null)
  }

  const handleDecline = async (requestId: string, title: string) => {
    setProcessingId(requestId)
    const response = await fetch(`/api/admin/book-requests/${requestId}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (response.ok) {
      toast.success(`Request for "${title}" declined`)
      fetchStats()
    } else {
      toast.error('Failed to decline request')
    }
    setProcessingId(null)
  }

  const statCards = [
    {
      title: 'Total Books',
      value: stats?.books.total || 0,
      description: `${stats?.books.available || 0} available`,
      icon: Book,
      color: 'text-blue-600',
      href: '/admin/books',
    },
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      description: 'Registered members',
      icon: Users,
      color: 'text-green-600',
      href: '/admin/users',
    },
    {
      title: 'Active Checkouts',
      value: stats?.checkouts.active || 0,
      description: 'Click to manage',
      icon: Clock,
      color: 'text-orange-600',
      href: '/admin/checkouts',
    },
    {
      title: 'Overdue',
      value: stats?.checkouts.overdue || 0,
      description: 'Need attention',
      icon: AlertTriangle,
      color: 'text-red-600',
      href: '/admin/checkouts?status=overdue',
    },
    {
      title: 'Book Requests',
      value: stats?.book_requests?.pending || 0,
      description: 'Pending review',
      icon: BookPlus,
      color: 'text-purple-600',
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => {
          const cardContent = (
            <Card className={card.href ? 'hover:bg-muted/50 transition-colors cursor-pointer' : ''}>
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
          )

          return card.href ? (
            <Link key={card.title} href={card.href}>
              {cardContent}
            </Link>
          ) : (
            <div key={card.title}>{cardContent}</div>
          )
        })}
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

      {/* Pending Book Requests */}
      {(stats?.pending_requests?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookPlus className="h-5 w-5 text-purple-600" />
              Pending Book Requests
            </CardTitle>
            <CardDescription>
              Members have requested these books to be added to the library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.pending_requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/admin/book-requests/${request.id}`}
                >
                  {/* Cover image thumbnail */}
                  {request.cover_url ? (
                    <div className="w-16 h-24 rounded overflow-hidden bg-muted flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={request.cover_url}
                        alt={request.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-24 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={request.user?.avatar_url || undefined} />
                        <AvatarFallback>
                          {request.user?.full_name?.charAt(0) || request.user?.email?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        {request.user?.full_name || request.user?.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-sm text-muted-foreground">{request.author}</p>
                    {request.isbn && (
                      <p className="text-xs text-muted-foreground mt-1">ISBN: {request.isbn}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link href={`/admin/book-requests/${request.id}`}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleApprove(request.id, request.title)}
                      disabled={processingId === request.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDecline(request.id, request.title)}
                      disabled={processingId === request.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
