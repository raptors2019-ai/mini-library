import { NextResponse } from 'next/server'
import { requireAuth, isErrorResponse, jsonSuccess } from '@/lib/api-utils'

export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth

  // Get user profile for checkout limit
  const { data: profile } = await supabase
    .from('profiles')
    .select('checkout_limit')
    .eq('id', user.id)
    .single()

  // Get active checkouts count
  const { count: activeCheckouts } = await supabase
    .from('checkouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active')

  // Get books read count (from user_books table)
  const { count: booksRead } = await supabase
    .from('user_books')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'read')

  // Get books rated count
  const { count: booksRated } = await supabase
    .from('user_books')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('rating', 'is', null)

  // Get waitlist count
  const { count: waitlistCount } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'waiting')

  // Get unread notifications count
  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  // Check if onboarding is completed
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  return jsonSuccess({
    activeCheckouts: activeCheckouts || 0,
    checkoutLimit: profile?.checkout_limit || 2,
    booksRead: booksRead || 0,
    booksRated: booksRated || 0,
    waitlistCount: waitlistCount || 0,
    unreadNotifications: unreadNotifications || 0,
    onboardingCompleted: preferences?.onboarding_completed || false,
  })
}
