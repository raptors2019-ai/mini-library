import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Force dynamic rendering - checkouts and notifications change frequently
export const dynamic = 'force-dynamic'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { NotificationsPanel } from '@/components/dashboard/notifications-panel'
import { WaitlistStatus } from '@/components/dashboard/waitlist-status'
import { OnboardingPrompt } from '@/components/dashboard/onboarding-prompt'
import { RecommendationsRow } from '@/components/dashboard/recommendations-row'
import { BecauseYouRead } from '@/components/dashboard/because-you-read'
import { DashboardActions } from './dashboard-actions'

async function getDashboardData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get stats and data for expandable cards
  const [
    { data: booksReadData },
    { data: booksRatedData },
    { count: waitlistCount },
    { count: unreadNotifications },
    { data: preferences },
  ] = await Promise.all([
    supabase
      .from('user_books')
      .select('*, book:books(*)')
      .eq('user_id', user.id)
      .eq('status', 'read')
      .order('date_finished', { ascending: false }),
    supabase
      .from('user_books')
      .select('*, book:books(*)')
      .eq('user_id', user.id)
      .not('rating', 'is', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'waiting'),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
    supabase
      .from('user_preferences')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single(),
  ])

  // Get current checkouts with book details
  const { data: checkouts } = await supabase
    .from('checkouts')
    .select('*, book:books(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('due_date', { ascending: true })

  // Get recent notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get waitlist entries with book details
  const { data: waitlistEntries } = await supabase
    .from('waitlist')
    .select('*, book:books(*)')
    .eq('user_id', user.id)
    .in('status', ['waiting', 'notified'])
    .order('position', { ascending: true })

  // Enrich waitlist entries with estimated availability
  const enrichedWaitlistEntries = await Promise.all(
    (waitlistEntries || []).map(async (entry) => {
      // Get current checkout for this book to calculate estimated availability
      const { data: currentCheckout } = await supabase
        .from('checkouts')
        .select('due_date')
        .eq('book_id', entry.book_id)
        .eq('status', 'active')
        .single()

      let estimatedDays: number | null = null
      if (currentCheckout?.due_date) {
        const dueDate = new Date(currentCheckout.due_date)
        // Add 14 days per person ahead in queue
        const additionalDays = (entry.position - 1) * 14
        dueDate.setDate(dueDate.getDate() + additionalDays)
        const now = new Date()
        estimatedDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (estimatedDays < 0) estimatedDays = 0
      }

      return {
        ...entry,
        estimated_days: estimatedDays,
      }
    })
  )

  return {
    profile,
    stats: {
      booksRead: booksReadData?.length || 0,
      booksRated: booksRatedData?.length || 0,
      activeCheckouts: checkouts?.length || 0,
      checkoutLimit: profile?.checkout_limit || 2,
      waitlistCount: waitlistCount || 0,
      unreadNotifications: unreadNotifications || 0,
    },
    booksReadList: booksReadData || [],
    booksRatedList: booksRatedData || [],
    checkouts: checkouts || [],
    notifications: notifications || [],
    waitlistEntries: enrichedWaitlistEntries,
    onboardingCompleted: preferences?.onboarding_completed || false,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const firstName = data.profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {firstName}!</h1>
        <p className="text-subheading mt-1">
          Here&apos;s what&apos;s happening with your library account.
        </p>
      </div>

      {/* Onboarding Prompt */}
      {!data.onboardingCompleted && <OnboardingPrompt />}

      {/* Stats Cards */}
      <StatsCards
        booksRead={data.stats.booksRead}
        activeCheckouts={data.stats.activeCheckouts}
        checkoutLimit={data.stats.checkoutLimit}
        waitlistCount={data.stats.waitlistCount}
        booksRated={data.stats.booksRated}
        booksReadList={data.booksReadList}
        booksRatedList={data.booksRatedList}
        checkoutsList={data.checkouts}
        waitlistList={data.waitlistEntries}
      />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current Checkouts */}
        <DashboardActions checkouts={data.checkouts} checkoutLimit={data.stats.checkoutLimit} />

        {/* Notifications */}
        <NotificationsPanel notifications={data.notifications} />
      </div>

      {/* Waitlist */}
      {data.waitlistEntries.length > 0 && (
        <WaitlistStatus waitlistEntries={data.waitlistEntries} />
      )}

      {/* Recommendations */}
      <RecommendationsRow onboardingCompleted={data.onboardingCompleted} />

      {/* Because You Read - personalized recommendations */}
      {data.onboardingCompleted && data.stats.booksRated > 0 && (
        <BecauseYouRead />
      )}
    </div>
  )
}
