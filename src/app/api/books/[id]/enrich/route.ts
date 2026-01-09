import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, generateBookSummary, generateGenres, createEmbeddingText } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/constants'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get the book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {}

    // Generate AI summary if not present
    if (!book.ai_summary) {
      const summary = await generateBookSummary({
        title: book.title,
        author: book.author,
        description: book.description,
        genres: book.genres,
      })
      updates.ai_summary = summary
    }

    // Generate genres if not present
    if (!book.genres || book.genres.length === 0) {
      const genres = await generateGenres({
        title: book.title,
        author: book.author,
        description: book.description,
      })
      updates.genres = genres
    }

    // Generate embedding
    const embeddingText = createEmbeddingText({
      title: book.title,
      author: book.author,
      description: book.description,
      ai_summary: updates.ai_summary || book.ai_summary,
      genres: updates.genres || book.genres,
    })
    const embedding = await generateEmbedding(embeddingText)
    // Store embedding as array of numbers
    updates.embedding = embedding

    // Update the book
    const { data: updatedBook, error: updateError } = await supabase
      .from('books')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      book: updatedBook,
      enriched: {
        ai_summary: !!updates.ai_summary,
        genres: !!updates.genres,
        embedding: true,
      }
    })
  } catch (error) {
    console.error('AI enrichment error:', error)
    return NextResponse.json({ error: 'Failed to enrich book with AI' }, { status: 500 })
  }
}
