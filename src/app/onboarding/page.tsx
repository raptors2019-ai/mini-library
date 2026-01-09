import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './onboarding-wizard'

async function getOnboardingData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if already completed onboarding
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  if (preferences?.onboarding_completed) {
    redirect('/dashboard')
  }

  // Get popular books for selection
  const { data: popularBooks } = await supabase
    .from('books')
    .select('id, title, author, cover_url, genres')
    .neq('status', 'inactive')
    .not('cover_url', 'is', null)
    .limit(50)

  // Get user's already added books
  const { data: userBooks } = await supabase
    .from('user_books')
    .select('book_id, rating')
    .eq('user_id', user.id)

  // Get all available genres
  const { data: booksWithGenres } = await supabase
    .from('books')
    .select('genres')
    .not('genres', 'is', null)

  const allGenres = new Set<string>()
  booksWithGenres?.forEach(book => {
    book.genres?.forEach((genre: string) => allGenres.add(genre))
  })

  return {
    popularBooks: popularBooks || [],
    userBooks: userBooks || [],
    availableGenres: Array.from(allGenres).sort(),
  }
}

export default async function OnboardingPage() {
  const data = await getOnboardingData()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-8">
      <OnboardingWizard
        popularBooks={data.popularBooks}
        existingUserBooks={data.userBooks}
        availableGenres={data.availableGenres}
      />
    </div>
  )
}
