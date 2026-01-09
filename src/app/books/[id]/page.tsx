import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Calendar,
  Edit,
  FileText,
  User,
  Clock,
  Users
} from 'lucide-react'
import { CheckoutButton } from '@/components/books/checkout-button'
import { WaitlistButton } from '@/components/books/waitlist-button'
import { BookCoverImage } from '@/components/books/book-cover-image'
import { BOOK_STATUS_COLORS, BOOK_STATUS_LABELS, isAdminRole } from '@/lib/constants'
import type { BookStatus } from '@/types/database'

interface BookDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !book) {
    notFound()
  }

  // Get current checkout
  const { data: checkout } = await supabase
    .from('checkouts')
    .select('*, user:profiles(id, full_name, email)')
    .eq('book_id', id)
    .eq('status', 'active')
    .single()

  // Get waitlist count
  const { count: waitlistCount } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', id)
    .eq('status', 'waiting')

  // Get current user and their role
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = null
  let userWaitlistEntry = null
  let userActiveCheckout = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role

    // Check if user is on waitlist for this book
    const { data: waitlistEntry } = await supabase
      .from('waitlist')
      .select('*')
      .eq('book_id', id)
      .eq('user_id', user.id)
      .eq('status', 'waiting')
      .single()
    userWaitlistEntry = waitlistEntry

    // Check user's active checkouts count
    const { count } = await supabase
      .from('checkouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')
    userActiveCheckout = count || 0
  }

  const canEdit = isAdminRole(userRole)
  const isAvailable = book.status === 'available'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/books">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Books
          </Button>
        </Link>
        {canEdit && (
          <Link href={`/books/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Book
            </Button>
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-8">
        {/* Book Cover */}
        <div className="space-y-4 mx-auto lg:mx-0 max-w-[280px] lg:max-w-none w-full">
          <div className="aspect-[2/3] relative bg-muted rounded-lg overflow-hidden">
            <BookCoverImage
              src={book.cover_url}
              alt={book.title}
              priority
              iconSize="lg"
            />
          </div>

          {/* Actions */}
          {user && (
            <div className="space-y-2">
              {isAvailable ? (
                <CheckoutButton
                  bookId={book.id}
                  disabled={!user || userActiveCheckout! >= 2}
                />
              ) : (
                <WaitlistButton
                  bookId={book.id}
                  isOnWaitlist={!!userWaitlistEntry}
                  waitlistPosition={userWaitlistEntry?.position}
                />
              )}
            </div>
          )}

          {!user && (
            <Link href="/login">
              <Button className="w-full">Sign in to checkout</Button>
            </Link>
          )}
        </div>

        {/* Book Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={BOOK_STATUS_COLORS[book.status as BookStatus]}>
                {BOOK_STATUS_LABELS[book.status as BookStatus]}
              </Badge>
              {book.genres?.map((genre: string) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl font-bold">{book.title}</h1>
            <p className="text-xl text-muted-foreground mt-1">{book.author}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {book.isbn && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">ISBN</div>
                  <div className="font-medium">{book.isbn}</div>
                </CardContent>
              </Card>
            )}
            {book.page_count && (
              <Card>
                <CardContent className="p-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Pages</div>
                    <div className="font-medium">{book.page_count}</div>
                  </div>
                </CardContent>
              </Card>
            )}
            {book.publish_date && (
              <Card>
                <CardContent className="p-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Published</div>
                    <div className="font-medium">{new Date(book.publish_date).getFullYear()}</div>
                  </div>
                </CardContent>
              </Card>
            )}
            {(waitlistCount ?? 0) > 0 && (
              <Card>
                <CardContent className="p-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Waitlist</div>
                    <div className="font-medium">{waitlistCount} waiting</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {book.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {book.description}
                </p>
              </CardContent>
            </Card>
          )}

          {book.ai_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {book.ai_summary}
                </p>
              </CardContent>
            </Card>
          )}

          {checkout && canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Current Checkout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {(checkout.user as { full_name?: string })?.full_name || (checkout.user as { email?: string })?.email}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {new Date(checkout.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
