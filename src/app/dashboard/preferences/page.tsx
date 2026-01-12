import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreferencesEditor } from '@/components/dashboard/preferences-editor'

export const dynamic = 'force-dynamic'

async function getPreferencesData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get all available genres from books in the catalog
  const { data: booksWithGenres } = await supabase
    .from('books')
    .select('genres')
    .not('genres', 'is', null)

  const allGenres = new Set<string>()
  booksWithGenres?.forEach(book => {
    book.genres?.forEach((genre: string) => allGenres.add(genre))
  })

  // Get user's current preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('favorite_genres, disliked_genres, preferred_length, reading_moods')
    .eq('user_id', user.id)
    .single()

  return {
    availableGenres: Array.from(allGenres).sort(),
    preferences,
  }
}

export default async function PreferencesPage() {
  const data = await getPreferencesData()

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Reading Preferences</h1>
          <p className="text-muted-foreground">
            Customize your preferences to get better book recommendations
          </p>
        </div>
      </div>

      {/* Editor */}
      <PreferencesEditor
        availableGenres={data.availableGenres}
        initialPreferences={data.preferences}
      />
    </div>
  )
}
