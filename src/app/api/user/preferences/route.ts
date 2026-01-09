import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: preferences, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ preferences: preferences || null })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        favorite_genres,
        disliked_genres,
        preferred_length,
        reading_moods,
        onboarding_completed,
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preferences: data })
  }

  // Create new
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ preferences: data }, { status: 201 })
}
