'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface WhyYouMightLikeProps {
  bookId: string
  bookTitle: string
  bookGenres: string[]
}

type ReasonType = 'genre' | 'author' | 'similar' | 'popular'

interface Reason {
  type: ReasonType
  text: string
}

const REASON_TYPE_LABELS: Record<ReasonType, string> = {
  genre: 'Genre Match',
  similar: 'Your Taste',
  author: 'Author',
  popular: 'Popular',
}

const GENRE_SUGGESTIONS: Record<string, string> = {
  'Fiction': 'Highly rated by readers who enjoy thoughtful narratives',
  'Literary Fiction': 'Highly rated by readers who enjoy thoughtful narratives',
  'Mystery': 'Features engaging suspense that keeps readers hooked',
  'Thriller': 'Features engaging suspense that keeps readers hooked',
  'Science Fiction': 'Offers imaginative world-building and creative storytelling',
  'Fantasy': 'Offers imaginative world-building and creative storytelling',
  'Self-Help': 'Contains practical insights for personal growth',
  'Personal Development': 'Contains practical insights for personal growth',
}

function buildReasons(
  bookGenres: string[],
  userGenres: string[],
  hasTasteProfile: boolean
): Reason[] {
  const reasons: Reason[] = []

  // Check genre match
  const matchingGenres = bookGenres.filter(g =>
    userGenres.some(ug => ug.toLowerCase() === g.toLowerCase())
  )

  if (matchingGenres.length > 0) {
    const genreWord = matchingGenres.length === 1 ? 'genre' : 'genres'
    reasons.push({
      type: 'genre',
      text: `Matches your favorite ${genreWord}: ${matchingGenres.join(', ')}`,
    })
  }

  if (hasTasteProfile) {
    reasons.push({
      type: 'similar',
      text: "Similar to books you've enjoyed based on your reading history",
    })
  }

  // Add genre-based suggestions (only add one per unique suggestion text)
  const addedSuggestions = new Set<string>()
  for (const genre of bookGenres) {
    const suggestion = GENRE_SUGGESTIONS[genre]
    if (suggestion && !addedSuggestions.has(suggestion)) {
      addedSuggestions.add(suggestion)
      reasons.push({ type: 'popular', text: suggestion })
    }
  }

  return reasons.slice(0, 3)
}

export function WhyYouMightLike({ bookId, bookGenres }: WhyYouMightLikeProps): React.ReactElement | null {
  const [reasons, setReasons] = useState<Reason[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReasons(): Promise<void> {
      try {
        const response = await fetch('/api/user/taste-profile')
        if (!response.ok) {
          setLoading(false)
          return
        }

        const data = await response.json()
        const userGenres: string[] = data.favoriteGenres || []
        const newReasons = buildReasons(bookGenres, userGenres, data.hasTasteProfile)
        setReasons(newReasons)
      } catch (error) {
        console.error('Failed to fetch reasons:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReasons()
  }, [bookId, bookGenres])

  if (loading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing why you might like this...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (reasons.length === 0) {
    return null
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          Why You Might Like This
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {reasons.map((reason, index) => (
          <div key={index} className="flex items-start gap-2">
            <Badge variant="outline" className="shrink-0 text-xs">
              {REASON_TYPE_LABELS[reason.type]}
            </Badge>
            <p className="text-sm text-muted-foreground">{reason.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
