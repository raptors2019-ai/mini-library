'use client'

import { BookOpen, FileText, Star, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ReadingStatsProps {
  stats: {
    totalRead: number
    currentlyReading: number
    wantToRead: number
    totalRated: number
    totalPages: number
  }
  topGenres: Array<{ genre: string; count: number }>
}

export function ReadingStats({ stats, topGenres }: ReadingStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-500/10">
            <BookOpen className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.totalRead}</p>
            <p className="text-sm text-muted-foreground">Books Read</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-green-500/10">
            <FileText className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Pages Read</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-yellow-500/10">
            <Star className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.totalRated}</p>
            <p className="text-sm text-muted-foreground">Books Rated</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-purple-500/10">
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            {topGenres.length > 0 ? (
              <>
                <p className="text-lg font-bold line-clamp-1">{topGenres[0].genre}</p>
                <p className="text-sm text-muted-foreground">Top Genre</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold">-</p>
                <p className="text-sm text-muted-foreground">Top Genre</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
