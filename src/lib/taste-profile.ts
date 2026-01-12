import { SupabaseClient } from '@supabase/supabase-js'

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
// - Rated books (any status): rating² (5-star = 25, 3-star = 9)
// - Unrated reads: 9 (default positive - they finished it)
// - DNF books: -4 (soft negative penalty)
function getWeight(status: string, rating: number | null): number {
  // Ratings take priority - if they rated it, use that signal
  if (rating !== null) return Math.pow(rating, 2)
  // DNF without rating is a negative signal
  if (status === 'dnf') return -4
  // Unrated but read is positive (they finished it)
  if (status === 'read') return 9
  // Other statuses without rating shouldn't be included
  return 1
}

function extractEmbedding(book: BookEmbedding | BookEmbedding[] | null): number[] | null {
  if (!book) return null
  const bookData = Array.isArray(book) ? book[0] : book
  return bookData?.embedding || null
}

export interface RecalculateResult {
  success: boolean
  booksUsed: number
  message: string
}

/**
 * Recalculates and saves a user's taste profile based on their rated/read books.
 * Call this after any change to user_books (rating, status, add, delete).
 */
export async function recalculateTasteProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<RecalculateResult> {
  // Get user's books with embeddings for taste profile
  // Includes: all rated books (any status) + unrated 'read' books + DNF books
  const { data: userBooks, error: booksError } = await supabase
    .from('user_books')
    .select('rating, status, book:books(embedding)')
    .eq('user_id', userId)
    .or('rating.not.is.null,status.eq.read,status.eq.dnf')

  if (booksError) {
    console.error('Taste profile: Error fetching user books:', booksError)
    return { success: false, booksUsed: 0, message: booksError.message }
  }

  if (!userBooks || userBooks.length === 0) {
    console.log('Taste profile: No qualifying books found for user', userId)
    return { success: true, booksUsed: 0, message: 'No books found for taste profile' }
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
    console.log('Taste profile: No books with embeddings found for user', userId)
    return { success: true, booksUsed: 0, message: 'No books with embeddings found' }
  }

  // Calculate weighted average embedding
  const tasteEmbedding = new Array(EMBEDDING_SIZE).fill(0)
  let totalWeight = 0

  for (const userBook of booksWithEmbeddings) {
    const weight = getWeight(userBook.status, userBook.rating)

    for (let i = 0; i < EMBEDDING_SIZE; i++) {
      tasteEmbedding[i] += userBook.embedding[i] * weight
    }

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
      user_id: userId,
      taste_embedding: tasteEmbedding,
    }, {
      onConflict: 'user_id',
    })

  if (updateError) {
    console.error('Taste profile: Error saving:', updateError)
    return { success: false, booksUsed: booksWithEmbeddings.length, message: updateError.message }
  }

  console.log(`Taste profile: Updated for user ${userId} using ${booksWithEmbeddings.length} books`)
  return {
    success: true,
    booksUsed: booksWithEmbeddings.length,
    message: 'Taste profile updated'
  }
}
