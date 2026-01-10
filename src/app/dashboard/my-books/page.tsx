import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ArrowLeft, Plus, CheckCircle, BookMarked, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MyBooksList } from './my-books-list'
import { ReadingStats } from './reading-stats'

async function getMyBooksData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get all user books with book details
  const { data: userBooks } = await supabase
    .from('user_books')
    .select('*, book:books(*)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  // Calculate stats
  const stats = {
    totalRead: userBooks?.filter(ub => ub.status === 'read').length || 0,
    currentlyReading: userBooks?.filter(ub => ub.status === 'reading').length || 0,
    wantToRead: userBooks?.filter(ub => ub.status === 'want_to_read').length || 0,
    dnf: userBooks?.filter(ub => ub.status === 'dnf').length || 0,
    totalRated: userBooks?.filter(ub => ub.rating).length || 0,
    totalPages: userBooks?.reduce((sum, ub) => {
      if (ub.status === 'read' && ub.book?.page_count) {
        return sum + ub.book.page_count
      }
      return sum
    }, 0) || 0,
  }

  // Get top genres
  const genreCounts = new Map<string, number>()
  userBooks?.filter(ub => ub.status === 'read').forEach(ub => {
    ub.book?.genres?.forEach((genre: string) => {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)
    })
  })
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre, count]) => ({ genre, count }))

  return {
    userBooks: userBooks || [],
    stats,
    topGenres,
  }
}

export default async function MyBooksPage() {
  const data = await getMyBooksData()

  const readBooks = data.userBooks.filter(ub => ub.status === 'read')
  const readingBooks = data.userBooks.filter(ub => ub.status === 'reading')
  const wantToReadBooks = data.userBooks.filter(ub => ub.status === 'want_to_read')
  const dnfBooks = data.userBooks.filter(ub => ub.status === 'dnf')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-3xl font-bold">My Books</h1>
          </div>
        </div>
        <Link href="/books">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Button>
        </Link>
      </div>

      {/* Reading Stats */}
      <ReadingStats stats={data.stats} topGenres={data.topGenres} />

      {/* Book Shelves */}
      <Tabs defaultValue="reading" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="reading" className="flex items-center gap-2 py-3">
            <BookMarked className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Reading</span>
            <span className="text-xs text-muted-foreground">({data.stats.currentlyReading})</span>
          </TabsTrigger>
          <TabsTrigger value="want_to_read" className="flex items-center gap-2 py-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">Want to Read</span>
            <span className="text-xs text-muted-foreground">({data.stats.wantToRead})</span>
          </TabsTrigger>
          <TabsTrigger value="read" className="flex items-center gap-2 py-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="hidden sm:inline">Read</span>
            <span className="text-xs text-muted-foreground">({data.stats.totalRead})</span>
          </TabsTrigger>
          <TabsTrigger value="dnf" className="flex items-center gap-2 py-3">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">DNF</span>
            <span className="text-xs text-muted-foreground">({data.stats.dnf})</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reading" className="mt-6">
          <MyBooksList userBooks={readingBooks} emptyMessage="Not currently reading anything" />
        </TabsContent>
        <TabsContent value="want_to_read" className="mt-6">
          <MyBooksList userBooks={wantToReadBooks} emptyMessage="No books on your want to read list" />
        </TabsContent>
        <TabsContent value="read" className="mt-6">
          <MyBooksList userBooks={readBooks} emptyMessage="No books marked as read yet" />
        </TabsContent>
        <TabsContent value="dnf" className="mt-6">
          <MyBooksList userBooks={dnfBooks} emptyMessage="No books marked as did not finish" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
