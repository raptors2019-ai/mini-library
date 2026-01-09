import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Get reviews and ratings for a book
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  // Get reviews with user info
  const { data: reviews, error } = await supabase
    .from('user_books')
    .select(`
      id,
      rating,
      review,
      created_at,
      updated_at,
      user:profiles(id, full_name, avatar_url)
    `)
    .eq('book_id', id)
    .not('rating', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate aggregate stats
  const { data: stats } = await supabase
    .from('user_books')
    .select('rating')
    .eq('book_id', id)
    .not('rating', 'is', null)

  const ratings = stats?.map(s => s.rating) || []
  const totalRatings = ratings.length
  const averageRating = totalRatings > 0
    ? ratings.reduce((sum, r) => sum + (r || 0), 0) / totalRatings
    : 0

  // Rating distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ratings.forEach(r => {
    if (r && r >= 1 && r <= 5) {
      distribution[r as 1 | 2 | 3 | 4 | 5]++
    }
  })

  // Count reviews with text
  const reviewCount = reviews?.filter(r => r.review).length || 0

  return NextResponse.json({
    reviews: reviews || [],
    stats: {
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount,
      distribution,
    },
  })
}
