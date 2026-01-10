import { createClient } from '@/lib/supabase/server'
import { Library, Plus } from 'lucide-react'
import { BookFilters } from '@/components/books/book-filters'
import { BookCarousel } from '@/components/books/book-carousel'
import { BookGrid } from '@/components/books/book-grid'
import { Pagination } from '@/components/books/pagination'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Suspense } from 'react'
import { getBooksWithCovers } from '@/lib/google-books'
import { getHardcoverBookData, getHardcoverBookByTitleAuthor } from '@/lib/hardcover'

interface BooksPageProps {
  searchParams: Promise<{
    page?: string
    statuses?: string
    genres?: string
    search?: string
  }>
}

async function getTrendingBooks() {
  const supabase = await createClient()

  const { data: books } = await supabase
    .from('books')
    .select('id, isbn, title, author, status, cover_url, genres')
    .neq('status', 'inactive')

  if (!books || books.length === 0) {
    return []
  }

  // Shuffle books randomly
  const shuffled = [...books].sort(() => Math.random() - 0.5).slice(0, 10)

  // Fetch cover URLs from Google Books
  const coverMap = await getBooksWithCovers(shuffled)

  return shuffled.map(book => ({
    ...book,
    cover_url: coverMap.get(book.id) || book.cover_url || null
  }))
}

async function getTopRatedBooks() {
  const supabase = await createClient()

  // Get all active books - we'll search Hardcover by ISBN or title/author
  const { data: books } = await supabase
    .from('books')
    .select('id, isbn, title, author, status, cover_url, genres')
    .neq('status', 'inactive')
    .limit(30) // Fetch more to allow for sorting after getting Hardcover data

  if (!books || books.length === 0) {
    return []
  }

  // Fetch Hardcover ratings for each book (with parallelization)
  // Try ISBN first, then fall back to title/author search
  const booksWithRatings = await Promise.all(
    books.map(async (book) => {
      try {
        // Try ISBN first if available
        let hardcoverData = book.isbn ? await getHardcoverBookData(book.isbn) : null

        // Fallback to title/author search if ISBN lookup failed
        if (!hardcoverData && book.title && book.author) {
          hardcoverData = await getHardcoverBookByTitleAuthor(book.title, book.author)
        }

        return {
          ...book,
          hardcover_rating: hardcoverData?.rating || null,
          hardcover_ratings_count: hardcoverData?.ratingsCount || 0
        }
      } catch {
        return { ...book, hardcover_rating: null, hardcover_ratings_count: 0 }
      }
    })
  )

  // Filter books that have Hardcover ratings and sort by rating
  const ratedBooks = booksWithRatings
    .filter(book => book.hardcover_rating !== null && book.hardcover_rating > 0)
    .sort((a, b) => {
      // Sort by rating first, then by number of ratings
      if ((b.hardcover_rating || 0) !== (a.hardcover_rating || 0)) {
        return (b.hardcover_rating || 0) - (a.hardcover_rating || 0)
      }
      return (b.hardcover_ratings_count || 0) - (a.hardcover_ratings_count || 0)
    })
    .slice(0, 10)

  if (ratedBooks.length === 0) {
    return []
  }

  const coverMap = await getBooksWithCovers(ratedBooks)

  return ratedBooks.map(book => ({
    id: book.id,
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    status: book.status,
    cover_url: coverMap.get(book.id) || book.cover_url || null,
    genres: book.genres,
    average_rating: book.hardcover_rating,
    rating_count: book.hardcover_ratings_count
  }))
}


async function BooksContent({ searchParams }: BooksPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const page = parseInt(params.page || '1')
  const limit = 12
  const offset = (page - 1) * limit

  // Check if any filters are active
  const hasActiveFilters = params.statuses || params.genres || params.search

  let query = supabase
    .from('books')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  // Handle multiple statuses
  const selectedStatuses = params.statuses?.split(',').filter(Boolean) || []
  if (selectedStatuses.length > 0) {
    query = query.in('status', selectedStatuses)
  } else {
    query = query.neq('status', 'inactive')
  }

  // Handle multiple genres (books that contain ANY of the selected genres)
  const selectedGenres = params.genres?.split(',').filter(Boolean) || []
  if (selectedGenres.length > 0) {
    query = query.overlaps('genres', selectedGenres)
  }

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,author.ilike.%${params.search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data: books, count } = await query

  const totalPages = Math.ceil((count || 0) / limit)

  // Get user role for add book button
  const { data: { user } } = await supabase.auth.getUser()
  let canAddBooks = false
  const isLoggedIn = !!user
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    canAddBooks = profile?.role === 'librarian' || profile?.role === 'admin'
  }

  // Fetch carousel data (only when no filters are active)
  let trendingBooks: Awaited<ReturnType<typeof getTrendingBooks>> = []
  let topRatedBooks: Awaited<ReturnType<typeof getTopRatedBooks>> = []

  if (!hasActiveFilters) {
    ;[trendingBooks, topRatedBooks] = await Promise.all([
      getTrendingBooks(),
      getTopRatedBooks()
    ])
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Library className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Library</h1>
        </div>
        {canAddBooks && (
          <Link href="/books/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </Link>
        )}
      </div>

      {/* Search/Filters - always at top */}
      <Suspense fallback={<div className="h-12" />}>
        <BookFilters />
      </Suspense>

      {/* Carousels - only show when no filters are active */}
      {!hasActiveFilters && (
        <div className="space-y-4 -mx-4 sm:-mx-6 lg:-mx-8">
          {trendingBooks.length > 0 && (
            <BookCarousel
              books={trendingBooks}
              title="Trending Now"
              subtitle="Popular picks from our collection"
              icon="trending"
            />
          )}

          {topRatedBooks.length > 0 && (
            <BookCarousel
              books={topRatedBooks}
              title="Top Rated"
              subtitle="Highest rated on Hardcover"
              icon="star"
              showRating
            />
          )}
        </div>
      )}

      {/* Grid - only show when filters are active (search results) */}
      {hasActiveFilters && (
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Showing {books?.length || 0} of {count || 0} results
          </div>

          <BookGrid books={books || []} showAddButton={isLoggedIn} />

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              total={count || 0}
            />
          )}
        </div>
      )}
    </>
  )
}

export default function BooksPage(props: BooksPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<BookGrid books={[]} loading />}>
        <BooksContent {...props} />
      </Suspense>
    </div>
  )
}
