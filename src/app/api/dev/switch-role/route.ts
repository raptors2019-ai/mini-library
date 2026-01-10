import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/types/database'
import { CHECKOUT_LIMITS } from '@/lib/constants'

const VALID_ROLES: UserRole[] = ['guest', 'member', 'premium', 'librarian', 'admin']

// Roles that get premium checkout limits
const PREMIUM_ROLES: UserRole[] = ['premium', 'librarian', 'admin']

/**
 * Switch user role for demo/testing purposes
 * Available to all logged-in users to facilitate testing different user experiences
 */
export async function POST(request: NextRequest): Promise<NextResponse> {

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

  // Set checkout limits based on role
  const isPremium = PREMIUM_ROLES.includes(role)
  const limits = isPremium ? CHECKOUT_LIMITS.premium : CHECKOUT_LIMITS.standard

  const { data, error } = await supabase
    .from('profiles')
    .update({
      role,
      checkout_limit: limits.maxBooks,
      hold_duration_days: limits.loanDays,
    })
    .eq('id', user.id)
    .select('id, email, role, checkout_limit, hold_duration_days')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: `Role switched to ${role}`,
    isPremium,
    profile: data
  })
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, checkout_limit, hold_duration_days')
    .eq('id', user.id)
    .single()

  const isPremium = profile?.role ? PREMIUM_ROLES.includes(profile.role as UserRole) : false

  return NextResponse.json({
    currentRole: profile?.role,
    isPremium,
    availableRoles: VALID_ROLES,
    profile
  })
}
