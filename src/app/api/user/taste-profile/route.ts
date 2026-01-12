import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const EMBEDDING_SIZE = 1536

interface BookEmbedding {
  embedding: number[] | null
}

interface UserBookWithEmbedding {
  rating: number | null
  status: string
  book: BookEmbedding | BookEmbedding[] | null
}

// Calculate weight based on status and rating
// - Rated reads: rating² (5-star = 25, 3-star = 9)
// - Unrated reads: 9 (default positive - they finished it)
// - DNF books: -4 (soft negative penalty)
function getWeight(status: string, rating: number | null): number {
  if (status === 'dnf') return -4
  if (rating !== null) return Math.pow(rating, 2)
  return 9 // Unrated but read
}

function extractEmbedding(book: BookEmbedding | BookEmbedding[] | null): number[] | null {
  if (!book) return null
  const bookData = Array.isArray(book) ? book[0] : book
  return bookData?.embedding || null
}

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's read and DNF books with embeddings
  // Includes: rated reads, unrated reads, and DNF books
  const { data: userBooks, error: booksError } = await supabase
    .from('user_books')
    .select('rating, status, book:books(embedding)')
    .eq('user_id', user.id)
    .in('status', ['read', 'dnf'])

  if (booksError) {
    return NextResponse.json({ error: booksError.message }, { status: 500 })
  }

  if (!userBooks || userBooks.length === 0) {
    return NextResponse.json({
      message: 'No books found for taste profile',
      tasteEmbedding: null
    })
  }

  // Filter books that have embeddings
  const typedUserBooks = userBooks as UserBookWithEmbedding[]
  const booksWithEmbeddings: Array<{ rating: number | null; status: string; embedding: number[] }> = []

  for (const ub of typedUserBooks) {
    const embedding = extractEmbedding(ub.book)
    if (embedding) {
      booksWithEmbeddings.push({ rating: ub.rating, status: ub.status, embedding })
    }
  }

  if (booksWithEmbeddings.length === 0) {
    return NextResponse.json({
      message: 'No books with embeddings found',
      tasteEmbedding: null
    })
  }

  // Calculate weighted average embedding
  // Positive weights for read books, negative for DNF (pushes away from those themes)
  const tasteEmbedding = new Array(EMBEDDING_SIZE).fill(0)
  let totalWeight = 0

  for (const userBook of booksWithEmbeddings) {
    const weight = getWeight(userBook.status, userBook.rating)

    for (let i = 0; i < EMBEDDING_SIZE; i++) {
      tasteEmbedding[i] += userBook.embedding[i] * weight
    }

    // Use absolute weight for normalization
    totalWeight += Math.abs(weight)
  }

  // Normalize
  for (let i = 0; i < EMBEDDING_SIZE; i++) {
    tasteEmbedding[i] /= totalWeight
  }

  // Save to user_preferences
  const { error: updateError } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      taste_embedding: tasteEmbedding,
    }, {
      onConflict: 'user_id',
    })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Taste profile updated',
    booksUsed: booksWithEmbeddings.length,
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
