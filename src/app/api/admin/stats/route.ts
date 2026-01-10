import { NextResponse } from 'next/server'
import { requireAdmin, isErrorResponse } from '@/lib/api-utils'

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { supabase } = auth

  // Get all stats in parallel
  const [
    { count: totalBooks },
    { count: availableBooks },
    { count: checkedOutBooks },
    { count: totalUsers },
    { count: activeCheckouts },
    { count: overdueCheckouts },
    { count: waitlistEntries },
    { count: pendingBookRequests },
    { data: recentCheckouts },
    { data: topBooks },
    { data: pendingRequests },
  ] = await Promise.all([
    supabase.from('books').select('*', { count: 'exact', head: true }).neq('status', 'inactive'),
    supabase.from('books').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('books').select('*', { count: 'exact', head: true }).eq('status', 'checked_out'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('checkouts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('checkouts').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('waitlist').select('*', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase.from('book_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
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
    supabase
      .from('book_requests')
      .select('*, user:profiles!user_id(full_name, email)')
      .eq('status', 'pending')
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
    book_requests: {
      pending: pendingBookRequests || 0,
    },
    recent_checkouts: recentCheckouts || [],
    recent_books: topBooks || [],
    pending_requests: pendingRequests || [],
  })
}
