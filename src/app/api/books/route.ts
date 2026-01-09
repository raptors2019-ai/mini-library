import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, generateBookSummary, generateGenres, createEmbeddingText } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/constants'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status')
  const genre = searchParams.get('genre')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')
  const offset = (page - 1) * limit

  let query = supabase
    .from('books')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  } else {
    query = query.neq('status', 'inactive')
  }

  if (genre) {
    query = query.contains('genres', [genre])
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data: books, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    books,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const body = await request.json()
  const { title, author, isbn, description, cover_url, page_count, publish_date, genres, enrich_with_ai } = body

  if (!title || !author) {
    return NextResponse.json({ error: 'Title and author are required' }, { status: 400 })
  }

  let ai_summary: string | null = null
  let finalGenres = genres || []
  let embedding: string | null = null

  // AI enrichment if requested
  if (enrich_with_ai && process.env.OPENAI_API_KEY) {
    try {
      // Generate summary
      ai_summary = await generateBookSummary({ title, author, description, genres: finalGenres })

      // Generate genres if not provided
      if (finalGenres.length === 0) {
        finalGenres = await generateGenres({ title, author, description })
      }

      // Generate embedding
      const embeddingText = createEmbeddingText({
        title,
        author,
        description,
        ai_summary,
        genres: finalGenres,
      })
      const embeddingVector = await generateEmbedding(embeddingText)
      embedding = JSON.stringify(embeddingVector)
    } catch (aiError) {
      console.error('AI enrichment error:', aiError)
      // Continue without AI enrichment
    }
  }

  const { data: book, error } = await supabase
    .from('books')
    .insert({
      title,
      author,
      isbn: isbn || null,
      description: description || null,
      ai_summary,
      cover_url: cover_url || null,
      page_count: page_count || null,
      publish_date: publish_date || null,
      genres: finalGenres,
      embedding,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(book, { status: 201 })
}
