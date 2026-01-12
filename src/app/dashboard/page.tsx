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
import { MyBooksCallout } from '@/components/dashboard/my-books-callout'
import { PreferencesCallout } from '@/components/dashboard/preferences-callout'
import { DashboardActions } from './dashboard-actions'
import { isPriorityRole, getHoldDurationHours } from '@/lib/constants'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { getCurrentDate } from '@/lib/simulated-date'
import { processHoldTransitions } from '@/lib/hold-transitions'

// Process any expired waitlist holds for this user
async function processExpiredHolds(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, userId: string) {
  const now = await getCurrentDate(supabase)

  // Find user's expired holds
  const { data: expiredEntries } = await supabase
    .from('waitlist')
    .select('*, book:books(id, title)')
    .eq('user_id', userId)
    .eq('status', 'notified')
    .lt('expires_at', now.toISOString())

  if (!expiredEntries || expiredEntries.length === 0) return

  for (const entry of expiredEntries) {
    const bookId = entry.book_id
    const bookTitle = entry.book?.title || 'Unknown Book'

    // Mark as expired
    await supabase
      .from('waitlist')
      .update({ status: 'expired' })
      .eq('id', entry.id)

    // Notify user
    const notification = notificationTemplates.waitlistExpired(bookTitle)
    await createNotification({
      supabase,
      userId,
      bookId,
      ...notification,
    })

    // Find next in line
    const { data: nextInLine } = await supabase
      .from('waitlist')
      .select('id, user_id')
      .eq('book_id', bookId)
      .eq('status', 'waiting')
      .order('is_priority', { ascending: false })
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (nextInLine) {
      // Get next person's role for hold duration
      const { data: nextUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', nextInLine.user_id)
        .single()

      const holdHours = getHoldDurationHours(nextUserProfile?.role)
      const expiresAt = new Date(now)
      expiresAt.setHours(expiresAt.getHours() + holdHours)

      await supabase
        .from('waitlist')
        .update({
          status: 'notified',
          notified_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', nextInLine.id)

      // Notify next person
      const expirationLabel = holdHours === 24 ? '24 hours' : `${holdHours / 24} days`
      const availableNotification = notificationTemplates.waitlistAvailable(bookTitle, expirationLabel)
      await createNotification({
        supabase,
        userId: nextInLine.user_id,
        bookId,
        ...availableNotification,
      })
    } else {
      // No one else waiting, make book available
      await supabase
        .from('books')
        .update({ status: 'available' })
        .eq('id', bookId)
    }
  }
}

async function getDashboardData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Process any expired holds for this user (lazy expiration on dashboard load)
  await processExpiredHolds(supabase, user.id)

  // Process hold status transitions (on_hold_premium → on_hold_waitlist → available)
  await processHoldTransitions(supabase)

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
    { data: allUserBooks },
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
      .select('onboarding_completed, taste_embedding')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_books')
      .select('status')
      .eq('user_id', user.id),
  ])

  // Calculate reading list stats
  const readingListStats = {
    reading: allUserBooks?.filter(ub => ub.status === 'reading').length || 0,
    wantToRead: allUserBooks?.filter(ub => ub.status === 'want_to_read').length || 0,
    read: allUserBooks?.filter(ub => ub.status === 'read').length || 0,
  }

  // Get current checkouts with book details (include both active and overdue)
  const { data: checkouts } = await supabase
    .from('checkouts')
    .select('*, book:books(*)')
    .eq('user_id', user.id)
    .in('status', ['active', 'overdue'])
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

  // Enrich waitlist entries with estimated availability date
  const now = await getCurrentDate(supabase)
  const enrichedWaitlistEntries = await Promise.all(
    (waitlistEntries || []).map(async (entry) => {
      // If already notified, entry is available - no estimated date needed
      if (entry.status === 'notified') {
        return {
          ...entry,
          estimated_days: 0, // Available now
          estimated_date: null, // Available now
        }
      }

      // Get book status and current checkout info
      const [{ data: book }, { data: currentCheckout }] = await Promise.all([
        supabase
          .from('books')
          .select('status, hold_until')
          .eq('id', entry.book_id)
          .single(),
        supabase
          .from('checkouts')
          .select('due_date')
          .eq('book_id', entry.book_id)
          .in('status', ['active', 'overdue'])
          .single()
      ])

      let estimatedDays: number | null = null
      let estimatedDate: Date | null = null

      // Check if book is in hold status - calculate based on hold phase
      if (book?.status === 'on_hold_premium' && book.hold_until) {
        const holdStarted = new Date(book.hold_until)
        // Premium users can access now, regular users wait 24 hours
        if (entry.is_priority) {
          estimatedDate = now // Available now for premium
          estimatedDays = 0
        } else {
          // Wait for premium phase to end (24 hours from hold start)
          estimatedDate = new Date(holdStarted)
          estimatedDate.setHours(estimatedDate.getHours() + 24)
          estimatedDays = Math.ceil((estimatedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          if (estimatedDays < 0) estimatedDays = 0
        }
      } else if (book?.status === 'on_hold_waitlist') {
        // All waitlist users can access now
        estimatedDate = now
        estimatedDays = 0
      } else if (currentCheckout?.due_date) {
        const dueDate = new Date(currentCheckout.due_date)
        // Add 14 days per person ahead in queue
        const additionalDays = (entry.position - 1) * 14
        dueDate.setDate(dueDate.getDate() + additionalDays)
        // Add 2 days for hold periods (premium + waitlist phase)
        // But if user is premium, only add 0-1 days
        const holdDays = entry.is_priority ? 0 : 1
        dueDate.setDate(dueDate.getDate() + holdDays)
        estimatedDate = dueDate
        estimatedDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (estimatedDays < 0) estimatedDays = 0
      } else if (book?.status === 'checked_out') {
        // Fallback: Assume 14 days per position in queue
        estimatedDate = new Date(now)
        const totalDays = 14 * entry.position + (entry.is_priority ? 0 : 1)
        estimatedDate.setDate(estimatedDate.getDate() + totalDays)
        estimatedDays = totalDays
      }

      return {
        ...entry,
        estimated_days: estimatedDays,
        estimated_date: estimatedDate?.toISOString() || null,
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
    hasTasteProfile: preferences?.taste_embedding != null && preferences.taste_embedding.length > 0,
    readingListStats,
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

      {/* Onboarding Prompt or Preferences Callout */}
      {!data.onboardingCompleted ? (
        <OnboardingPrompt />
      ) : (
        <PreferencesCallout hasTasteProfile={data.hasTasteProfile} />
      )}

      {/* Stats Cards */}
      <StatsCards
        booksRead={data.stats.booksRead}
        activeCheckouts={data.stats.activeCheckouts}
        checkoutLimit={data.stats.checkoutLimit}
        waitlistCount={data.stats.waitlistCount}
        booksRated={data.stats.booksRated}
        booksReadList={data.booksReadList}
        booksRatedList={data.booksRatedList}
      />

      {/* View My Reading List Link */}
      <MyBooksCallout stats={data.readingListStats} />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current Checkouts */}
        <DashboardActions checkouts={data.checkouts} checkoutLimit={data.stats.checkoutLimit} />

        {/* Notifications */}
        <NotificationsPanel />
      </div>

      {/* Waitlist */}
      {data.waitlistEntries.length > 0 && (
        <WaitlistStatus
          waitlistEntries={data.waitlistEntries}
          isPriorityUser={isPriorityRole(data.profile?.role)}
        />
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
