import { BookOpen, FileText, Star, TrendingUp, Target, User, CalendarDays, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ReadingStatsProps {
  stats: {
    totalRead: number
    currentlyReading: number
    wantToRead: number
    dnf: number
    totalRated: number
    totalPages: number
    avgRating: number
    booksThisYear: number
    yearlyGoal: number
  }
  topGenres: Array<{ genre: string; count: number }>
  favoriteAuthor: { name: string; count: number } | null
}

export function ReadingStats({ stats, topGenres, favoriteAuthor }: ReadingStatsProps) {
  const completionRate = stats.totalRead + stats.dnf > 0
    ? Math.round((stats.totalRead / (stats.totalRead + stats.dnf)) * 100)
    : 100

  const goalProgress = stats.yearlyGoal > 0
    ? Math.min(Math.round((stats.booksThisYear / stats.yearlyGoal) * 100), 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Primary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <BookOpen className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalRead}</p>
                <p className="text-sm text-muted-foreground">Books Read</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pages Read</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Yearly Goal */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-cyan-500/10">
                <Target className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {new Date().getFullYear()} Reading Goal
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.booksThisYear}/{stats.yearlyGoal || '?'}
              </p>
            </div>
            {stats.yearlyGoal > 0 ? (
              <Progress value={goalProgress} className="h-2" />
            ) : (
              <p className="text-xs text-muted-foreground">Set a goal in your profile</p>
            )}
          </CardContent>
        </Card>

        {/* Top Genre */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-pink-500/10">
                <TrendingUp className="h-4 w-4 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Top Genre</p>
                {topGenres.length > 0 ? (
                  <p className="text-lg font-bold truncate">{topGenres[0].genre}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </div>
              {topGenres.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {topGenres[0].count} books
                </span>
              )}
            </div>
            {topGenres.length > 1 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {topGenres.slice(1, 3).map((g) => (
                  <span key={g.genre} className="text-xs px-2 py-1 rounded-full bg-muted">
                    {g.genre}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Favorite Author */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/10">
                <User className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Most Read Author</p>
                {favoriteAuthor ? (
                  <p className="text-lg font-bold truncate">{favoriteAuthor.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </div>
              {favoriteAuthor && (
                <span className="text-xs text-muted-foreground">
                  {favoriteAuthor.count} books
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Summary */}
      <Card className="bg-gradient-to-r from-muted/50 to-muted/30 border-dashed">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Library Summary</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-3 rounded-lg bg-background/60">
              <span className="text-2xl font-bold text-blue-500">{stats.currentlyReading}</span>
              <span className="text-xs text-muted-foreground text-center">Currently Reading</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-background/60">
              <span className="text-2xl font-bold text-amber-500">{stats.wantToRead}</span>
              <span className="text-xs text-muted-foreground text-center">On Your List</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-background/60">
              <span className="text-2xl font-bold text-yellow-500">{stats.totalRated}</span>
              <span className="text-xs text-muted-foreground text-center">Books Rated</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-background/60">
              <span className="text-2xl font-bold text-muted-foreground">{stats.dnf}</span>
              <span className="text-xs text-muted-foreground text-center">Did Not Finish</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
