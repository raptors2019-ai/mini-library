import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/constants'

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all stats in parallel
  const [
    { count: totalBooks },
    { count: availableBooks },
    { count: checkedOutBooks },
    { count: totalUsers },
    { count: activeCheckouts },
    { count: overdueCheckouts },
    { count: waitlistEntries },
    { data: recentCheckouts },
    { data: topBooks },
  ] = await Promise.all([
    supabase.from('books').select('*', { count: 'exact', head: true }).neq('status', 'inactive'),
    supabase.from('books').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('books').select('*', { count: 'exact', head: true }).eq('status', 'checked_out'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('checkouts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('checkouts').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('waitlist').select('*', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase
      .from('checkouts')
      .select('*, book:books(title, cover_url), user:profiles(full_name, email)')
      .eq('status', 'active')
      .order('checked_out_at', { ascending: false })
      .limit(5),
    supabase
      .from('books')
      .select('id, title, author, cover_url, status')
      .neq('status', 'inactive')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return NextResponse.json({
    books: {
      total: totalBooks || 0,
      available: availableBooks || 0,
      checked_out: checkedOutBooks || 0,
    },
    users: {
      total: totalUsers || 0,
    },
    checkouts: {
      active: activeCheckouts || 0,
      overdue: overdueCheckouts || 0,
    },
    waitlist: {
      total: waitlistEntries || 0,
    },
    recent_checkouts: recentCheckouts || [],
    recent_books: topBooks || [],
  })
}
