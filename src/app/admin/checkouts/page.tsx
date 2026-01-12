'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CalendarPlus,
  AlertTriangle,
  BookOpen,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { CHECKOUT_STATUS_COLORS, CHECKOUT_STATUS_LABELS } from '@/lib/constants'
import type { CheckoutWithBookAndUser, CheckoutStatus } from '@/types/database'

interface CheckoutsResponse {
  checkouts: CheckoutWithBookAndUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    overdueCount: number
  }
}

export default function AdminCheckoutsPage() {
  const [checkouts, setCheckouts] = useState<CheckoutWithBookAndUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithBookAndUser | null>(null)
  const [extendDays, setExtendDays] = useState(7)

  const fetchCheckouts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
    })
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)

    const response = await fetch(`/api/admin/checkouts?${params}`)
    if (response.ok) {
      const data: CheckoutsResponse = await response.json()
      setCheckouts(data.checkouts)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    }
    setLoading(false)
  }, [page, search, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetching with async setState is valid
    fetchCheckouts()
  }, [fetchCheckouts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const handleReturn = async (checkoutId: string) => {
    setActionLoadingId(checkoutId)
    const response = await fetch(`/api/admin/checkouts/${checkoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'return' }),
    })
    if (response.ok) {
      toast.success('Book returned successfully')
      fetchCheckouts()
    } else {
      toast.error('Failed to return book')
    }
    setActionLoadingId(null)
  }

  const handleExtend = async () => {
    if (!selectedCheckout) return
    setActionLoadingId(selectedCheckout.id)
    const response = await fetch(`/api/admin/checkouts/${selectedCheckout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'extend', extend_days: extendDays }),
    })
    if (response.ok) {
      toast.success(`Due date extended by ${extendDays} days`)
      fetchCheckouts()
    } else {
      toast.error('Failed to extend due date')
    }
    setActionLoadingId(null)
    setExtendDialogOpen(false)
    setSelectedCheckout(null)
  }

  const handleMarkOverdue = async (checkoutId: string) => {
    setActionLoadingId(checkoutId)
    const response = await fetch(`/api/admin/checkouts/${checkoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_overdue' }),
    })
    if (response.ok) {
      toast.success('Checkout marked as overdue')
      fetchCheckouts()
    } else {
      toast.error('Failed to mark as overdue')
    }
    setActionLoadingId(null)
  }

  const isActuallyOverdue = (checkout: CheckoutWithBookAndUser) => {
    return checkout.status === 'active' && new Date(checkout.due_date) < new Date()
  }

  const openExtendDialog = (checkout: CheckoutWithBookAndUser) => {
    setSelectedCheckout(checkout)
    setExtendDays(7)
    setExtendDialogOpen(true)
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

      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Manage Checkouts</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Checkouts</CardTitle>
          <CardDescription>
            {total} total checkouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <Input
                placeholder="Search by book title or borrower..."
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
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Checked Out</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-12 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : checkouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No checkouts found
                    </TableCell>
                  </TableRow>
                ) : (
                  checkouts.map((checkout) => (
                    <TableRow key={checkout.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {checkout.book?.cover_url ? (
                            <Image
                              src={checkout.book.cover_url}
                              alt={checkout.book.title}
                              width={32}
                              height={48}
                              className="h-12 w-8 object-cover rounded"
                            />
                          ) : (
                            <div className="h-12 w-8 bg-muted rounded flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/books/${checkout.book_id}`}
                              className="font-medium hover:underline line-clamp-1"
                            >
                              {checkout.book?.title || 'Unknown Book'}
                            </Link>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {checkout.book?.author}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={checkout.user?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {checkout.user?.full_name?.charAt(0) || checkout.user?.email?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[150px]">
                            {checkout.user?.full_name || checkout.user?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(checkout.checked_out_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className={isActuallyOverdue(checkout) ? 'text-red-600 font-medium flex items-center gap-1' : 'text-sm'}>
                          {isActuallyOverdue(checkout) && <AlertTriangle className="h-3 w-3" />}
                          {new Date(checkout.due_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={CHECKOUT_STATUS_COLORS[checkout.status as CheckoutStatus]}
                        >
                          {CHECKOUT_STATUS_LABELS[checkout.status as CheckoutStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {checkout.status !== 'returned' && (
                          <div className="flex items-center justify-end gap-1">
                            {/* Extend Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openExtendDialog(checkout)}
                              disabled={actionLoadingId === checkout.id}
                              title="Extend due date"
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </Button>

                            {/* Mark Overdue Button (only if past due and still active) */}
                            {isActuallyOverdue(checkout) && checkout.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkOverdue(checkout.id)}
                                disabled={actionLoadingId === checkout.id}
                                title="Mark as overdue"
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Return Button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={actionLoadingId === checkout.id}
                                  title="Return book"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Return Book</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Mark &quot;{checkout.book?.title}&quot; as returned? This will update the book status and notify any waitlist users.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleReturn(checkout.id)}>
                                    Return
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
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

      {/* Extend Due Date Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Due Date</DialogTitle>
            <DialogDescription>
              Extend the due date for &quot;{selectedCheckout?.book?.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={extendDays.toString()} onValueChange={(v) => setExtendDays(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days (1 week)</SelectItem>
                <SelectItem value="14">14 days (2 weeks)</SelectItem>
                <SelectItem value="30">30 days (1 month)</SelectItem>
              </SelectContent>
            </Select>
            {selectedCheckout && (
              <p className="text-sm text-muted-foreground mt-2">
                Current due date: {new Date(selectedCheckout.due_date).toLocaleDateString()}
                <br />
                New due date: {(() => {
                  const newDate = new Date(selectedCheckout.due_date)
                  newDate.setDate(newDate.getDate() + extendDays)
                  return newDate.toLocaleDateString()
                })()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtend} disabled={actionLoadingId !== null}>
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
