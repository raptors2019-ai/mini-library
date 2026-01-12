'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Book, Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { BOOK_STATUS_COLORS, BOOK_STATUS_LABELS } from '@/lib/constants'
import type { Book as BookType, BookStatus } from '@/types/database'

interface BooksResponse {
  books: BookType[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminBooksPage() {
  const [books, setBooks] = useState<BookType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [enrichingId, setEnrichingId] = useState<string | null>(null)

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
    })
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)

    const response = await fetch(`/api/books?${params}`)
    if (response.ok) {
      const data: BooksResponse = await response.json()
      setBooks(data.books)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    }
    setLoading(false)
  }, [page, search, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetching with async setState is valid
    fetchBooks()
  }, [fetchBooks])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const handleDelete = async (bookId: string) => {
    const response = await fetch(`/api/books/${bookId}`, { method: 'DELETE' })
    if (response.ok) {
      toast.success('Book deleted successfully')
      fetchBooks()
    } else {
      toast.error('Failed to delete book')
    }
  }

  const handleEnrich = async (bookId: string) => {
    setEnrichingId(bookId)
    const response = await fetch(`/api/books/${bookId}/enrich`, { method: 'POST' })
    if (response.ok) {
      toast.success('Book enriched with AI')
      fetchBooks()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Failed to enrich book')
    }
    setEnrichingId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back to Admin */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground hover:text-foreground">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Portal
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Manage Books</h1>
        </div>
        <Button asChild>
          <Link href="/books/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Book Catalog</CardTitle>
          <CardDescription>
            {total} books in the library
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <Input
                placeholder="Search by title or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="on_hold_premium">On Hold (Premium)</SelectItem>
                <SelectItem value="on_hold_waitlist">On Hold (Waitlist)</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : books.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No books found
                    </TableCell>
                  </TableRow>
                ) : (
                  books.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <Link href={`/books/${book.id}`} className="hover:text-primary">
                          {book.title}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {book.author}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={BOOK_STATUS_COLORS[book.status as BookStatus]}>
                          {BOOK_STATUS_LABELS[book.status as BookStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {book.ai_summary ? (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEnrich(book.id)}
                            disabled={enrichingId === book.id}
                          >
                            {enrichingId === book.id ? (
                              <span className="animate-pulse">...</span>
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/books/${book.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Book</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{book.title}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(book.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
