import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isErrorResponse, jsonError, jsonSuccess } from '@/lib/api-utils'

export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth

  const { data: preferences, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // PGRST116 means no rows found - that's okay
  if (error && error.code !== 'PGRST116') {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ preferences: preferences || null })
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const body = await request.json()
  const {
    favorite_genres,
    disliked_genres,
    preferred_length,
    reading_moods,
    onboarding_completed,
  } = body

  // Check if preferences exist
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const updates = {
    favorite_genres,
    disliked_genres,
    preferred_length,
    reading_moods,
    onboarding_completed,
  }

  if (existing) {
    const { data, error } = await supabase
      .from('user_preferences')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return jsonError(error.message, 500)
    }

    return jsonSuccess({ preferences: data })
  }

  // Create new with defaults
  const { data, error } = await supabase
    .from('user_preferences')
    .insert({
      user_id: user.id,
      favorite_genres: favorite_genres || [],
      disliked_genres: disliked_genres || [],
      preferred_length: preferred_length || 'any',
      reading_moods: reading_moods || [],
      onboarding_completed: onboarding_completed || false,
    })
    .select()
    .single()

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({ preferences: data }, 201)
}
