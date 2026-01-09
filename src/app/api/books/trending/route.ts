import { createClient } from '@/lib/supabase/server'
import { getBooksWithCovers } from '@/lib/google-books'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600 // Cache for 1 hour

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const limit = parseInt(searchParams.get('limit') || '10')

  // Fetch books that are not inactive
  const { data: books, error } = await supabase
    .from('books')
    .select('id, isbn, title, author, status, cover_url, genres')
    .neq('status', 'inactive')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!books || books.length === 0) {
    return NextResponse.json({ books: [] })
  }

  // Shuffle books randomly
  const shuffled = [...books].sort(() => Math.random() - 0.5).slice(0, limit)

  // Fetch cover URLs from Google Books for books missing covers
  const coverMap = await getBooksWithCovers(shuffled)

  // Add cover URLs to books
  const booksWithCovers = shuffled.map(book => ({
    ...book,
    cover_url: coverMap.get(book.id) || book.cover_url || null
  }))

  return NextResponse.json({ books: booksWithCovers })
}
