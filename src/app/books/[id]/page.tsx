import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Calendar,
  Edit,
  FileText,
  User,
  Clock,
  Users,
  Sparkles
} from 'lucide-react'
import { CheckoutButton } from '@/components/books/checkout-button'
import { WaitlistButton } from '@/components/books/waitlist-button'
import { BookCoverImage } from '@/components/books/book-cover-image'
import { SimilarBooks } from '@/components/books/similar-books'
import { AddToMyBooksButton } from '@/components/books/add-to-my-books-button'
import { UserBookForm } from '@/components/books/user-book-form'
import { WhyYouMightLike } from '@/components/books/why-you-might-like'
import { ExternalRating } from '@/components/books/external-rating'
import { ReviewSummary } from '@/components/books/review-summary'
import { HardcoverReviews } from '@/components/books/hardcover-reviews'
import { BookContentTabs } from '@/components/books/book-content-tabs'
import { BOOK_STATUS_COLORS, BOOK_STATUS_LABELS, isAdminRole } from '@/lib/constants'
import { estimateReadingTime } from '@/lib/utils'
import type { BookStatus, UserBookStatus } from '@/types/database'

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

  // Get community stats (reader count and review count)
  const { count: readerCount } = await supabase
    .from('user_books')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', id)

  const { count: reviewCount } = await supabase
    .from('user_books')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', id)
    .not('review', 'is', null)

  // Get current user and their role
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = null
  let userWaitlistEntry = null
  let userActiveCheckout = null
  let userBookEntry: { status: UserBookStatus; rating: number | null; review: string | null } | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role

    const { data: waitlistEntry } = await supabase
      .from('waitlist')
      .select('*')
      .eq('book_id', id)
      .eq('user_id', user.id)
      .eq('status', 'waiting')
      .single()
    userWaitlistEntry = waitlistEntry

    const { count } = await supabase
      .from('checkouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')
    userActiveCheckout = count || 0

    const { data: userBook } = await supabase
      .from('user_books')
      .select('status, rating, review')
      .eq('book_id', id)
      .eq('user_id', user.id)
      .single()
    if (userBook) {
      userBookEntry = userBook as { status: UserBookStatus; rating: number | null; review: string | null }
    }
  }

  const canEdit = isAdminRole(userRole)
  const isAvailable = book.status === 'available'

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/books">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Books</span>
          </Button>
        </Link>
        {canEdit && (
          <Link href={`/books/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-8 lg:gap-12">
        {/* Left Column - Cover & Actions */}
        <div className="space-y-6">
          {/* Book Cover with shadow and depth */}
          <div className="relative mx-auto lg:mx-0 max-w-[300px]">
            <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/10">
              <BookCoverImage
                src={book.cover_url}
                alt={book.title}
                priority
                iconSize="lg"
              />
            </div>
            {/* Decorative shadow underneath */}
            <div className="absolute -bottom-4 left-4 right-4 h-8 bg-gradient-to-t from-black/10 to-transparent blur-xl -z-10" />
          </div>

          {/* Actions */}
          <div className="space-y-3 max-w-[300px] mx-auto lg:mx-0">
            {user && (
              <>
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
                <AddToMyBooksButton
                  bookId={book.id}
                  existingStatus={userBookEntry?.status}
                  existingRating={userBookEntry?.rating}
                />
              </>
            )}

            {!user && (
              <Link href="/login" className="block">
                <Button className="w-full">Sign in to checkout</Button>
              </Link>
            )}
          </div>

          {/* User's Rating/Review Form */}
          {user && (
            <div className="max-w-[300px] mx-auto lg:mx-0">
              <UserBookForm
                bookId={book.id}
                existingStatus={userBookEntry?.status}
                existingRating={userBookEntry?.rating}
                existingReview={userBookEntry?.review}
              />
            </div>
          )}
        </div>

        {/* Right Column - Book Details */}
        <div className="space-y-6">
          {/* Header Section */}
          <header className="space-y-4">
            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${BOOK_STATUS_COLORS[book.status as BookStatus]} font-medium`}
              >
                {BOOK_STATUS_LABELS[book.status as BookStatus]}
              </Badge>
              {(waitlistCount ?? 0) > 0 && (
                <Badge variant="secondary" className="gap-1.5">
                  <Users className="h-3 w-3" />
                  {waitlistCount} waiting
                </Badge>
              )}
            </div>

            {/* Title - Large and dramatic */}
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
                {book.title}
              </h1>
              <p className="mt-3 text-xl lg:text-2xl text-muted-foreground font-light">
                by <span className="text-foreground font-normal">{book.author}</span>
              </p>
            </div>

            {/* Book metadata - Clean inline display */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground pt-2">
              {book.publish_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 opacity-60" />
                  {new Date(book.publish_date).getFullYear()}
                </span>
              )}
              {book.page_count && (
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 opacity-60" />
                  {book.page_count} pages
                </span>
              )}
              {estimateReadingTime(book.page_count) && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 opacity-60" />
                  {estimateReadingTime(book.page_count)}
                </span>
              )}
            </div>

            {/* Genres - Pill style */}
            {book.genres && book.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {book.genres.map((genre: string) => (
                  <span
                    key={genre}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary/80 text-secondary-foreground hover:bg-secondary transition-colors"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* External Rating from Hardcover - always visible (reviews in tab) */}
          <ExternalRating bookId={book.id} showReviews={false} />

          {/* Tabbed Content */}
          <BookContentTabs
            bookInfo={
              <div className="space-y-6">
                {/* Why You Might Like This */}
                {user && book.genres && book.genres.length > 0 && (
                  <WhyYouMightLike
                    bookId={book.id}
                    bookTitle={book.title}
                    bookGenres={book.genres}
                  />
                )}

                {/* Description */}
                {book.description && (
                  <section className="space-y-3">
                    <h2 className="text-lg font-semibold">About this book</h2>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {book.description}
                      </p>
                    </div>
                  </section>
                )}

                {/* AI Summary */}
                {book.ai_summary && (
                  <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border border-primary/10 p-6">
                    <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                    <div className="relative space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
                          AI Summary
                        </h2>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {book.ai_summary}
                      </p>
                    </div>
                  </section>
                )}

                {/* Admin: Current Checkout Info */}
                {checkout && canEdit && (
                  <section className="rounded-xl border bg-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">Current Checkout</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {(checkout.user as { full_name?: string })?.full_name || (checkout.user as { email?: string })?.email}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Clock className="h-3.5 w-3.5" />
                          Due: {new Date(checkout.due_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            }
            reviews={
              <div className="space-y-6">
                <ReviewSummary bookId={book.id} />
                <HardcoverReviews bookId={book.id} />
              </div>
            }
          />
        </div>
      </div>

      {/* Similar Books Section */}
      <SimilarBooks bookId={book.id} />
    </div>
  )
}
