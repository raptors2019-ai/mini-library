'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, BookOpen, Check, Sparkles, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface Book {
  id: string
  title: string
  author: string
  cover_url: string | null
  genres: string[] | null
}

interface UserBookEntry {
  book_id: string
  rating: number | null
}

interface OnboardingWizardProps {
  popularBooks: Book[]
  existingUserBooks: UserBookEntry[]
  availableGenres: string[]
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
}

const READING_MOODS = [
  { id: 'thrilling', label: 'Thrilling & Suspenseful', icon: '😱' },
  { id: 'thought-provoking', label: 'Thought-provoking', icon: '🤔' },
  { id: 'light', label: 'Light & Fun', icon: '😄' },
  { id: 'educational', label: 'Educational', icon: '📚' },
  { id: 'emotional', label: 'Emotional & Moving', icon: '💝' },
  { id: 'adventurous', label: 'Adventurous', icon: '🗺️' },
]

export function OnboardingWizard({ popularBooks, existingUserBooks, availableGenres }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Step 1: Books
  const [selectedBooks, setSelectedBooks] = useState<Map<string, number>>(
    new Map(existingUserBooks.map(ub => [ub.book_id, ub.rating || 0]))
  )

  // Step 2: Genres
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())

  // Step 3: Preferences
  const [preferredLength, setPreferredLength] = useState<string>('any')
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set())

  const filteredBooks = popularBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleBook = (bookId: string) => {
    const newSelected = new Map(selectedBooks)
    if (newSelected.has(bookId)) {
      newSelected.delete(bookId)
    } else {
      newSelected.set(bookId, 0) // 0 means selected but not rated
    }
    setSelectedBooks(newSelected)
  }

  const setRating = (bookId: string, rating: number) => {
    const newSelected = new Map(selectedBooks)
    newSelected.set(bookId, rating)
    setSelectedBooks(newSelected)
  }

  const toggleGenre = (genre: string) => {
    const newSelected = new Set(selectedGenres)
    if (newSelected.has(genre)) {
      newSelected.delete(genre)
    } else {
      newSelected.add(genre)
    }
    setSelectedGenres(newSelected)
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

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1)
      return
    }

    // Complete onboarding
    setLoading(true)
    try {
      // Save selected books
      for (const [bookId, rating] of selectedBooks) {
        await fetch('/api/user/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            book_id: bookId,
            status: 'read',
            rating: rating > 0 ? rating : null,
          }),
        })
      }

      // Save preferences
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favorite_genres: Array.from(selectedGenres),
          preferred_length: preferredLength,
          reading_moods: Array.from(selectedMoods),
          onboarding_completed: true,
        }),
      })

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Onboarding error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    setLoading(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      })
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Step {step} of 3</span>
          <span>{Math.round((step / 3) * 100)}% complete</span>
        </div>
        <Progress value={(step / 3) * 100} className="h-2" />
      </div>

      {/* Step 1: Select Books */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">What have you read?</h1>
            <p className="text-muted-foreground mt-2">
              Select books you&apos;ve read and optionally rate them. This helps us recommend books you&apos;ll love.
            </p>
          </div>

          <Input
            placeholder="Search for books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md mx-auto"
          />

          {selectedBooks.size > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-muted-foreground">Selected:</span>
              {Array.from(selectedBooks.keys()).slice(0, 5).map(bookId => {
                const book = popularBooks.find(b => b.id === bookId)
                return book ? (
                  <Badge key={bookId} variant="secondary" className="text-xs">
                    {book.title.substring(0, 20)}...
                  </Badge>
                ) : null
              })}
              {selectedBooks.size > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{selectedBooks.size - 5} more
                </Badge>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-1">
            {filteredBooks.map(book => {
              const isSelected = selectedBooks.has(book.id)
              const rating = selectedBooks.get(book.id) || 0
              return (
                <div key={book.id} className="relative group">
                  <button
                    onClick={() => toggleBook(book.id)}
                    className={`w-full aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted">
                        <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                  <p className="text-xs mt-1 line-clamp-2 text-center">{book.title}</p>

                  {/* Rating stars - show when selected */}
                  {isSelected && (
                    <div className="flex justify-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setRating(book.id, star)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-3 w-3 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30'}`}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: Select Genres */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">What genres do you enjoy?</h1>
            <p className="text-muted-foreground mt-2">
              Select your favorite genres to help us personalize your recommendations.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableGenres.map(genre => {
              const isSelected = selectedGenres.has(genre)
              const icon = GENRE_ICONS[genre] || '📚'
              return (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <p className="font-medium mt-2">{genre}</p>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary mt-1" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Reading Preferences */}
      {step === 3 && (
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Almost done!</h1>
            <p className="text-muted-foreground mt-2">
              A few more preferences to help us find the perfect books for you.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">Book length preference</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'short', label: 'Short', desc: '< 200 pages' },
                  { value: 'medium', label: 'Medium', desc: '200-400 pages' },
                  { value: 'long', label: 'Long', desc: '400+ pages' },
                  { value: 'any', label: 'No preference', desc: 'Any length' },
                ].map(option => (
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

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">What reading moods do you enjoy?</h3>
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
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <div>
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleSkip} disabled={loading}>
              Skip for now
            </Button>
          )}
        </div>
        <Button onClick={handleNext} disabled={loading}>
          {loading ? (
            'Saving...'
          ) : step === 3 ? (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Complete Setup
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
