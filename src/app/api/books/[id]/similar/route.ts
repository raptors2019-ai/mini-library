import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '5')

  try {
    // Use RPC to call the similarity function
    const { data: books, error } = await supabase.rpc('find_similar_books', {
      book_id: id,
      match_count: limit
    })

    if (error) {
      // If the RPC function doesn't exist, fall back to genre-based similarity
      if (error.message.includes('function') || error.code === '42883') {
        console.warn('Similar books function not found, falling back to genre-based')

        // Get the source book
        const { data: sourceBook } = await supabase
          .from('books')
          .select('genres')
          .eq('id', id)
          .single()

        if (!sourceBook?.genres?.length) {
          return NextResponse.json({ books: [], book_id: id })
        }

        // Find books with overlapping genres
        const { data: genreBooks, error: genreError } = await supabase
          .from('books')
          .select('*')
          .neq('id', id)
          .neq('status', 'inactive')
          .overlaps('genres', sourceBook.genres)
          .limit(limit)

        if (genreError) {
          return NextResponse.json({ error: genreError.message }, { status: 500 })
        }

        return NextResponse.json({
          books: genreBooks,
          book_id: id,
          similarity_type: 'genre_fallback'
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      books,
      book_id: id,
      similarity_type: 'semantic'
    })
  } catch (error) {
    console.error('Similar books error:', error)
    return NextResponse.json({ error: 'Failed to find similar books' }, { status: 500 })
  }
}
