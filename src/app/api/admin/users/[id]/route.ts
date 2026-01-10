import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { supabase } = auth
  const body = await request.json()
  const { role, checkout_limit, hold_duration_days } = body

  const updates: Record<string, unknown> = {}
  if (role) updates.role = role
  if (checkout_limit !== undefined) updates.checkout_limit = checkout_limit
  if (hold_duration_days !== undefined) updates.hold_duration_days = hold_duration_days

  if (Object.keys(updates).length === 0) {
    return jsonError('No updates provided', 400)
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess(data)
}
