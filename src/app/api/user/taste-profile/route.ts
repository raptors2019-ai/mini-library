import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { recalculateTasteProfile } from '@/lib/taste-profile'

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await recalculateTasteProfile(supabase, user.id)

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  return NextResponse.json({
    message: result.message,
    booksUsed: result.booksUsed,
  })
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('taste_embedding, favorite_genres')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    hasTasteProfile: !!preferences?.taste_embedding,
    favoriteGenres: preferences?.favorite_genres || [],
  })
}
