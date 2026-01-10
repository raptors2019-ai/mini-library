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

  // Get user preferences for yearly goal
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('yearly_reading_goal')
    .eq('user_id', user.id)
    .single()

  const readBooks = userBooks?.filter(ub => ub.status === 'read') || []
  const ratedBooks = userBooks?.filter(ub => ub.rating) || []

  // Calculate average rating
  const avgRating = ratedBooks.length > 0
    ? ratedBooks.reduce((sum, ub) => sum + (ub.rating || 0), 0) / ratedBooks.length
    : 0

  // Calculate books read this year
  const currentYear = new Date().getFullYear()
  const booksThisYear = readBooks.filter(ub => {
    if (!ub.date_finished) return false
    return new Date(ub.date_finished).getFullYear() === currentYear
  }).length

  // Calculate stats
  const stats = {
    totalRead: readBooks.length,
    currentlyReading: userBooks?.filter(ub => ub.status === 'reading').length || 0,
    wantToRead: userBooks?.filter(ub => ub.status === 'want_to_read').length || 0,
    dnf: userBooks?.filter(ub => ub.status === 'dnf').length || 0,
    totalRated: ratedBooks.length,
    totalPages: readBooks.reduce((sum, ub) => {
      if (ub.book?.page_count) {
        return sum + ub.book.page_count
      }
      return sum
    }, 0),
    avgRating,
    booksThisYear,
    yearlyGoal: preferences?.yearly_reading_goal || 0,
  }

  // Get top genres
  const genreCounts = new Map<string, number>()
  readBooks.forEach(ub => {
    ub.book?.genres?.forEach((genre: string) => {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)
    })
  })
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre, count]) => ({ genre, count }))

  // Get favorite author (most read)
  const authorCounts = new Map<string, number>()
  readBooks.forEach(ub => {
    if (ub.book?.author) {
      authorCounts.set(ub.book.author, (authorCounts.get(ub.book.author) || 0) + 1)
    }
  })
  const topAuthor = Array.from(authorCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]
  const favoriteAuthor = topAuthor ? { name: topAuthor[0], count: topAuthor[1] } : null

  return {
    userBooks: userBooks || [],
    stats,
    topGenres,
    favoriteAuthor,
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
      <ReadingStats
        stats={data.stats}
        topGenres={data.topGenres}
        favoriteAuthor={data.favoriteAuthor}
      />

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
