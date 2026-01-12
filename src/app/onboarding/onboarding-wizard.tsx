'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface OnboardingWizardProps {
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

export function OnboardingWizard({ availableGenres }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1: Genre preferences
  const [favoriteGenres, setFavoriteGenres] = useState<Set<string>>(new Set())
  const [dislikedGenres, setDislikedGenres] = useState<Set<string>>(new Set())

  // Step 2: Reading preferences
  const [preferredLength, setPreferredLength] = useState<string>('any')
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set())

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

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1)
      return
    }

    // Complete onboarding
    setLoading(true)
    try {
      // Save preferences
      await fetch('/api/user/preferences', {
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
          <span>Step {step} of 2</span>
          <span>{Math.round((step / 2) * 100)}% complete</span>
        </div>
        <Progress value={(step / 2) * 100} className="h-2" />
      </div>

      {/* Step 1: Genre Preferences */}
      {step === 1 && (
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">What do you like to read?</h1>
            <p className="text-muted-foreground mt-2">
              Help us personalize your recommendations
            </p>
          </div>

          {/* Favorite Genres */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-lg">❤️</span>
              Genres you love
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
          </div>

          {/* Disliked Genres */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">🚫</span>
              Genres you&apos;d rather avoid
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              We&apos;ll show these less often (optional)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
          </div>
        </div>
      )}

      {/* Step 2: Reading Preferences */}
      {step === 2 && (
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
          ) : step === 2 ? (
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
