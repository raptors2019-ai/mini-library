import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/constants'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Check if user is admin
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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('checkouts')
    .select(`
      *,
      book:books(id, title, author, cover_url),
      user:profiles(id, email, full_name, avatar_url)
    `, { count: 'exact' })
    .order('checked_out_at', { ascending: false })

  // Filter by status
  if (status === 'active') {
    query = query.eq('status', 'active')
  } else if (status === 'overdue') {
    query = query.eq('status', 'active').lt('due_date', new Date().toISOString())
  } else if (status === 'returned') {
    query = query.eq('status', 'returned')
  }

  // Search by book title or user email/name
  if (search) {
    // We need to filter after fetching due to join limitations
    // For now, we'll fetch more and filter client-side
  }

  query = query.range(offset, offset + limit - 1)

  const { data: checkouts, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter by search if provided (client-side filtering for joined data)
  let filteredCheckouts = checkouts || []
  if (search && filteredCheckouts.length > 0) {
    const searchLower = search.toLowerCase()
    filteredCheckouts = filteredCheckouts.filter(c =>
      c.book?.title?.toLowerCase().includes(searchLower) ||
      c.user?.email?.toLowerCase().includes(searchLower) ||
      c.user?.full_name?.toLowerCase().includes(searchLower)
    )
  }

  // Calculate overdue count for stats
  const now = new Date()
  const overdueCount = (checkouts || []).filter(c =>
    c.status === 'active' && new Date(c.due_date) < now
  ).length

  return NextResponse.json({
    checkouts: filteredCheckouts,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    },
    stats: {
      overdueCount
    }
  })
}
