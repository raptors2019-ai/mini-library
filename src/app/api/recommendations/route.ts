import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Book } from '@/types/database'

interface BookWithId {
  id: string
}

function getBookIds(books: BookWithId[]): string[] {
  return books.map(book => book.id)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')
  const type = searchParams.get('type') || 'for-you'

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('favorite_genres, taste_embedding')
    .eq('user_id', user.id)
    .single()

  const { data: userBooks } = await supabase
    .from('user_books')
    .select('book_id')
    .eq('user_id', user.id)

  const readBookIds = userBooks?.map(ub => ub.book_id) || []

  const recommendations: Book[] = []
  let recommendationType = 'popular'

  // Try taste-based recommendations first
  if (preferences?.taste_embedding && type === 'for-you') {
    const { data: tasteMatches, error } = await supabase.rpc('match_books', {
      query_embedding: preferences.taste_embedding,
      match_threshold: 0.3,
      match_count: limit + readBookIds.length
    })

    if (!error && tasteMatches && tasteMatches.length > 0) {
      const filtered = (tasteMatches as Book[])
        .filter(book => !readBookIds.includes(book.id))
        .slice(0, limit)
      recommendations.push(...filtered)
      recommendationType = 'personalized'
    }
  }

  // Fallback to genre-based recommendations
  const favoriteGenres = preferences?.favorite_genres
  if (recommendations.length < limit && favoriteGenres && favoriteGenres.length > 0) {
    const remaining = limit - recommendations.length
    const existingIds = [...readBookIds, ...getBookIds(recommendations)]

    let genreQuery = supabase
      .from('books')
      .select('*')
      .neq('status', 'inactive')
      .overlaps('genres', favoriteGenres)

    if (existingIds.length > 0) {
      genreQuery = genreQuery.not('id', 'in', `(${existingIds.join(',')})`)
    }

    const { data: genreMatches } = await genreQuery
      .order('created_at', { ascending: false })
      .limit(remaining)

    if (genreMatches && genreMatches.length > 0) {
      recommendations.push(...genreMatches)
      if (recommendationType === 'popular') {
        recommendationType = 'genre-based'
      }
    }
  }

  // Final fallback to popular books
  if (recommendations.length < limit) {
    const remaining = limit - recommendations.length
    const existingIds = [...readBookIds, ...getBookIds(recommendations)]

    let popularQuery = supabase
      .from('books')
      .select('*')
      .neq('status', 'inactive')

    if (existingIds.length > 0) {
      popularQuery = popularQuery.not('id', 'in', `(${existingIds.join(',')})`)
    }

    const { data: popular } = await popularQuery
      .order('created_at', { ascending: false })
      .limit(remaining)

    if (popular) {
      recommendations.push(...popular)
    }
  }

  return NextResponse.json({
    recommendations,
    type: recommendationType,
    basedOnGenres: preferences?.favorite_genres || [],
    hasPersonalizedTaste: !!preferences?.taste_embedding,
  })
}
