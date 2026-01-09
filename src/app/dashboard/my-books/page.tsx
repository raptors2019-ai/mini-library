import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ArrowLeft, Plus } from 'lucide-react'
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
      <Tabs defaultValue="read" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="read">
            Read ({data.stats.totalRead})
          </TabsTrigger>
          <TabsTrigger value="reading">
            Reading ({data.stats.currentlyReading})
          </TabsTrigger>
          <TabsTrigger value="want_to_read">
            Want to Read ({data.stats.wantToRead})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="read" className="mt-6">
          <MyBooksList userBooks={readBooks} emptyMessage="No books marked as read yet" />
        </TabsContent>
        <TabsContent value="reading" className="mt-6">
          <MyBooksList userBooks={readingBooks} emptyMessage="Not currently reading anything" />
        </TabsContent>
        <TabsContent value="want_to_read" className="mt-6">
          <MyBooksList userBooks={wantToReadBooks} emptyMessage="No books on your want to read list" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
