'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Save, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

interface PreferencesEditorProps {
  availableGenres: string[]
  initialPreferences: {
    favorite_genres: string[]
    disliked_genres: string[]
    preferred_length: string
    reading_moods: string[]
  } | null
}

const GENRE_ICONS: Record<string, string> = {
  'Fiction': '📖',
  'Science Fiction': '🚀',
  'Fantasy': '🔮',
  'Mystery': '🔍',
  'Romance': '💕',
  'Thriller': '😱',
  'Biography': '👤',
  'History': '📜',
  'Science': '🔬',
  'Business': '💼',
  'Self-Help': '✨',
  'Children': '🧒',
  'Young Adult': '🎓',
  'Technology': '💻',
  'Horror': '👻',
  'Non-Fiction': '📚',
  'Memoir': '✍️',
  'Psychology': '🧠',
  'Philosophy': '🤔',
  'Poetry': '🎭',
}

const READING_MOODS = [
  { id: 'thrilling', label: 'Thrilling & Suspenseful', icon: '😱' },
  { id: 'thought-provoking', label: 'Thought-provoking', icon: '🤔' },
  { id: 'light', label: 'Light & Fun', icon: '😄' },
  { id: 'educational', label: 'Educational', icon: '📚' },
  { id: 'emotional', label: 'Emotional & Moving', icon: '💝' },
  { id: 'adventurous', label: 'Adventurous', icon: '🗺️' },
]

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short', desc: '< 200 pages' },
  { value: 'medium', label: 'Medium', desc: '200-400 pages' },
  { value: 'long', label: 'Long', desc: '400+ pages' },
  { value: 'any', label: 'No preference', desc: 'Any length' },
]

export function PreferencesEditor({ availableGenres, initialPreferences }: PreferencesEditorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // State for preferences
  const [favoriteGenres, setFavoriteGenres] = useState<Set<string>>(
    new Set(initialPreferences?.favorite_genres || [])
  )
  const [dislikedGenres, setDislikedGenres] = useState<Set<string>>(
    new Set(initialPreferences?.disliked_genres || [])
  )
  const [preferredLength, setPreferredLength] = useState<string>(
    initialPreferences?.preferred_length || 'any'
  )
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(
    new Set(initialPreferences?.reading_moods || [])
  )

  // Track changes
  useEffect(() => {
    const currentFavorites = Array.from(favoriteGenres).sort().join(',')
    const currentDislikes = Array.from(dislikedGenres).sort().join(',')
    const currentMoods = Array.from(selectedMoods).sort().join(',')

    const initialFavorites = (initialPreferences?.favorite_genres || []).sort().join(',')
    const initialDislikes = (initialPreferences?.disliked_genres || []).sort().join(',')
    const initialMoods = (initialPreferences?.reading_moods || []).sort().join(',')
    const initialLength = initialPreferences?.preferred_length || 'any'

    const changed =
      currentFavorites !== initialFavorites ||
      currentDislikes !== initialDislikes ||
      currentMoods !== initialMoods ||
      preferredLength !== initialLength

    setHasChanges(changed)
  }, [favoriteGenres, dislikedGenres, selectedMoods, preferredLength, initialPreferences])

  const toggleFavoriteGenre = (genre: string) => {
    const newFavorites = new Set(favoriteGenres)
    if (newFavorites.has(genre)) {
      newFavorites.delete(genre)
    } else {
      newFavorites.add(genre)
      // Can't be both favorite and disliked
      const newDislikes = new Set(dislikedGenres)
      newDislikes.delete(genre)
      setDislikedGenres(newDislikes)
    }
    setFavoriteGenres(newFavorites)
  }

  const toggleDislikedGenre = (genre: string) => {
    const newDislikes = new Set(dislikedGenres)
    if (newDislikes.has(genre)) {
      newDislikes.delete(genre)
    } else {
      newDislikes.add(genre)
      // Can't be both favorite and disliked
      const newFavorites = new Set(favoriteGenres)
      newFavorites.delete(genre)
      setFavoriteGenres(newFavorites)
    }
    setDislikedGenres(newDislikes)
  }

  const toggleMood = (mood: string) => {
    const newSelected = new Set(selectedMoods)
    if (newSelected.has(mood)) {
      newSelected.delete(mood)
    } else {
      newSelected.add(mood)
    }
    setSelectedMoods(newSelected)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favorite_genres: Array.from(favoriteGenres),
          disliked_genres: Array.from(dislikedGenres),
          preferred_length: preferredLength,
          reading_moods: Array.from(selectedMoods),
          onboarding_completed: true,
        }),
      })

      if (!response.ok) throw new Error('Failed to save preferences')

      // Trigger taste profile recalculation
      await fetch('/api/user/taste-profile', { method: 'POST' })

      toast.success('Preferences saved! Your recommendations will update shortly.')
      router.push('/dashboard')
    } catch (error) {
      console.error('Save preferences error:', error)
      toast.error('Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFavoriteGenres(new Set(initialPreferences?.favorite_genres || []))
    setDislikedGenres(new Set(initialPreferences?.disliked_genres || []))
    setPreferredLength(initialPreferences?.preferred_length || 'any')
    setSelectedMoods(new Set(initialPreferences?.reading_moods || []))
  }

  return (
    <div className="space-y-6">
      {/* Genre Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>❤️</span> Favorite Genres
          </CardTitle>
          <CardDescription>
            Select genres you love. We&apos;ll prioritize these in your recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {availableGenres.map(genre => {
              const isSelected = favoriteGenres.has(genre)
              const icon = GENRE_ICONS[genre] || '📚'
              return (
                <button
                  key={genre}
                  onClick={() => toggleFavoriteGenre(genre)}
                  className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="font-medium text-sm flex-1">{genre}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Disliked Genres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🚫</span> Genres to Avoid
          </CardTitle>
          <CardDescription>
            We&apos;ll show these less often in your recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {availableGenres
              .filter(g => !favoriteGenres.has(g))
              .map(genre => {
                const isSelected = dislikedGenres.has(genre)
                const icon = GENRE_ICONS[genre] || '📚'
                return (
                  <button
                    key={genre}
                    onClick={() => toggleDislikedGenre(genre)}
                    className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                      isSelected
                        ? 'border-destructive bg-destructive/10'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="font-medium text-sm flex-1">{genre}</span>
                    {isSelected && (
                      <X className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </button>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Book Length */}
      <Card>
        <CardHeader>
          <CardTitle>Book Length Preference</CardTitle>
          <CardDescription>
            What length of books do you prefer?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LENGTH_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setPreferredLength(option.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  preferredLength === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reading Moods */}
      <Card>
        <CardHeader>
          <CardTitle>Reading Moods</CardTitle>
          <CardDescription>
            What kind of reading experience are you looking for?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {READING_MOODS.map(mood => {
              const isSelected = selectedMoods.has(mood.id)
              return (
                <button
                  key={mood.id}
                  onClick={() => toggleMood(mood.id)}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <span className="text-xl">{mood.icon}</span>
                  <span className="text-sm">{mood.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Changes
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || loading}
        >
          {loading ? (
            'Saving...'
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>

      {hasChanges && (
        <p className="text-sm text-center text-muted-foreground">
          You have unsaved changes. Save to update your recommendations.
        </p>
      )}
    </div>
  )
}
