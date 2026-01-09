import { createClient } from '@/lib/supabase/server'
import { BookOpen, Plus } from 'lucide-react'
import { BookGrid } from '@/components/books/book-grid'
import { BookFilters } from '@/components/books/book-filters'
import { Pagination } from '@/components/books/pagination'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Suspense } from 'react'

interface BooksPageProps {
  searchParams: Promise<{
    page?: string
    statuses?: string
    genres?: string
    search?: string
  }>
}

async function BooksContent({ searchParams }: BooksPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const page = parseInt(params.page || '1')
  const limit = 12
  const offset = (page - 1) * limit

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

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Browse Books</h1>
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

      <Suspense fallback={<div className="h-12" />}>
        <BookFilters />
      </Suspense>

      <BookGrid books={books || []} showAddButton={isLoggedIn} />

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={count || 0}
        />
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
