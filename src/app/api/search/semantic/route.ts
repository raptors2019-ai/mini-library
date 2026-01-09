import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const body = await request.json()
  const { query, limit = 10 } = body

  if (!query) {
    return NextResponse.json({ error: 'Search query required' }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Semantic search not configured' }, { status: 503 })
  }

  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query)

    // Use RPC to call the similarity search function
    const { data: books, error } = await supabase.rpc('match_books', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: limit
    })

    if (error) {
      // If the RPC function doesn't exist, fall back to text search
      if (error.message.includes('function') || error.code === '42883') {
        console.warn('Semantic search function not found, falling back to text search')
        const { data: textBooks, error: textError } = await supabase
          .from('books')
          .select('*')
          .neq('status', 'inactive')
          .or(`title.ilike.%${query}%,author.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(limit)

        if (textError) {
          return NextResponse.json({ error: textError.message }, { status: 500 })
        }

        return NextResponse.json({
          books: textBooks,
          query,
          search_type: 'text_fallback'
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      books,
      query,
      search_type: 'semantic'
    })
  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
