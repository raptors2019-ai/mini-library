import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, generateBookSummary, generateGenres, createEmbeddingText } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['librarian', 'admin'].includes(profile.role)) {
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
    const updates: Record<string, unknown> = {}

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
      ai_summary: updates.ai_summary as string || book.ai_summary,
      genres: updates.genres as string[] || book.genres,
    })
    const embedding = await generateEmbedding(embeddingText)
    updates.embedding = JSON.stringify(embedding)

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
