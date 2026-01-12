'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, X, Loader2, Calendar, Hash, FileText, BookOpen, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface BookRequest {
  id: string
  title: string
  author: string
  isbn: string | null
  description: string | null
  cover_url: string | null
  page_count: number | null
  publish_date: string | null
  genres: string[] | null
  ai_summary: string | null
  enriched_at: string | null
  status: string
  created_at: string
  user: {
    full_name: string | null
    email: string
    avatar_url: string | null
  }
}

export default function BookRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [request, setRequest] = useState<BookRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const fetchRequest = async () => {
    const response = await fetch(`/api/admin/book-requests/${params.id}`)
    if (response.ok) {
      const data = await response.json()
      setRequest(data)
    } else {
      toast.error('Failed to load book request')
      router.push('/admin')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRequest()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const handleApprove = async () => {
    if (!request) return
    setProcessing(true)
    const response = await fetch(`/api/admin/book-requests/${request.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ createBook: true }),
    })
    if (response.ok) {
      toast.success(`"${request.title}" approved and added to library!`)
      router.push('/admin')
    } else {
      toast.error('Failed to approve request')
    }
    setProcessing(false)
  }

  const handleDecline = async () => {
    if (!request) return
    setProcessing(true)
    const response = await fetch(`/api/admin/book-requests/${request.id}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (response.ok) {
      toast.success(`Request for "${request.title}" declined`)
      router.push('/admin')
    } else {
      toast.error('Failed to decline request')
    }
    setProcessing(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-48 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!request) {
    return null
  }

  const isPending = request.status === 'pending'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review Book Request</h1>
            <p className="text-muted-foreground">
              Requested by {request.user?.full_name || request.user?.email}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {isPending && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleApprove}
              disabled={processing}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {processing ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={processing}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        )}
      </div>

      {/* Status badge for non-pending */}
      {!isPending && (
        <Badge variant={request.status === 'fulfilled' ? 'default' : 'secondary'} className="w-fit">
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </Badge>
      )}

      {/* Main content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Book cover and basic info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {request.cover_url ? (
                <div className="w-40 h-60 rounded-lg overflow-hidden shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={request.cover_url}
                    alt={request.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-40 h-60 rounded-lg bg-muted flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <div className="text-center">
                <h2 className="text-xl font-semibold">{request.title}</h2>
                <p className="text-muted-foreground">{request.author}</p>
              </div>

              {request.enriched_at && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Enriched
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Book Details</CardTitle>
            <CardDescription>Information provided with the request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metadata grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {request.isbn && (
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">ISBN</p>
                    <p className="font-medium">{request.isbn}</p>
                  </div>
                </div>
              )}

              {request.page_count && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pages</p>
                    <p className="font-medium">{request.page_count}</p>
                  </div>
                </div>
              )}

              {request.publish_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Published</p>
                    <p className="font-medium">{request.publish_date}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Requested</p>
                  <p className="font-medium">{new Date(request.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Genres */}
            {request.genres && request.genres.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Genres</p>
                <div className="flex flex-wrap gap-2">
                  {request.genres.map((genre) => (
                    <Badge key={genre} variant="outline">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {request.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Description</p>
                <p className="text-sm">{request.description}</p>
              </div>
            )}

            {/* AI Summary */}
            {request.ai_summary && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-600">AI Summary</p>
                </div>
                <p className="text-sm italic">&ldquo;{request.ai_summary}&rdquo;</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Requester info */}
      <Card>
        <CardHeader>
          <CardTitle>Requested By</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={request.user?.avatar_url || undefined} />
              <AvatarFallback>
                {request.user?.full_name?.charAt(0) || request.user?.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{request.user?.full_name || 'Unknown User'}</p>
              <p className="text-sm text-muted-foreground">{request.user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
