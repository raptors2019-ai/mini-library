import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/constants'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Standard JSON error response
 */
export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Standard JSON success response
 */
export function jsonSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Parse pagination params from URL search params
 */
export function getPaginationParams(searchParams: URLSearchParams): {
  page: number
  limit: number
  offset: number
} {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

/**
 * Create a pagination response object
 */
export function createPaginationResponse(
  page: number,
  limit: number,
  total: number
): {
  page: number
  limit: number
  total: number
  totalPages: number
} {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

interface AuthResult {
  user: User
  supabase: SupabaseClient
}

/**
 * Require authenticated user, returns error response if not authenticated
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  return { user, supabase }
}

interface AdminAuthResult extends AuthResult {
  profile: { role: string }
}

/**
 * Require admin (librarian or admin) role, returns error response if not authorized
 */
export async function requireAdmin(): Promise<AdminAuthResult | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) {
    return jsonError('Forbidden', 403)
  }

  return { user, supabase, profile: { role: profile!.role } }
}

/**
 * Check if the result is an error response
 */
export function isErrorResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}
