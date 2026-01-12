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

  // Get all available genres from books in the catalog
  const { data: booksWithGenres } = await supabase
    .from('books')
    .select('genres')
    .not('genres', 'is', null)

  const allGenres = new Set<string>()
  booksWithGenres?.forEach(book => {
    book.genres?.forEach((genre: string) => allGenres.add(genre))
  })

  return {
    availableGenres: Array.from(allGenres).sort(),
  }
}

export default async function OnboardingPage() {
  const data = await getOnboardingData()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-8">
      <OnboardingWizard availableGenres={data.availableGenres} />
    </div>
  )
}
