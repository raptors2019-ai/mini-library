import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/types/database'

const VALID_ROLES: UserRole[] = ['guest', 'member', 'premium', 'librarian', 'admin']

/**
 * DEV ONLY: Switch user role for testing
 * This endpoint should be disabled in production
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { role } = body as { role: UserRole }

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({
      error: 'Invalid role',
      validRoles: VALID_ROLES
    }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id)
    .select('id, email, role, checkout_limit')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: `Role switched to ${role}`,
    profile: data
  })
}

export async function GET(): Promise<NextResponse> {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, checkout_limit')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    currentRole: profile?.role,
    availableRoles: VALID_ROLES,
    profile
  })
}
