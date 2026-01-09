import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isPriorityRole } from '@/lib/constants'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { book_id } = body

  if (!book_id) {
    return NextResponse.json({ error: 'Book ID required' }, { status: 400 })
  }

  // Check if already on waitlist
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('book_id', book_id)
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already on waitlist' }, { status: 400 })
  }

  // Get current highest position
  const { data: lastEntry } = await supabase
    .from('waitlist')
    .select('position')
    .eq('book_id', book_id)
    .eq('status', 'waiting')
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (lastEntry?.position || 0) + 1

  // Check if user has priority (premium, librarian, admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isPriority = isPriorityRole(profile?.role)

  const { data: entry, error } = await supabase
    .from('waitlist')
    .insert({
      book_id,
      user_id: user.id,
      position,
      is_priority: isPriority
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(entry, { status: 201 })
}
