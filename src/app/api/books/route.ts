import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, generateBookSummary, generateGenres, createEmbeddingText } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  isErrorResponse,
  getPaginationParams,
  createPaginationResponse,
  jsonError,
  jsonSuccess,
} from '@/lib/api-utils'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status')
  const genre = searchParams.get('genre')
  const search = searchParams.get('search')
  const { page, limit, offset } = getPaginationParams(searchParams)

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
    // Check if search looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search)
    if (isUuid) {
      query = query.eq('id', search)
    } else {
      // Search across title, author, ISBN, and description
      // Also check if search term matches any genre (case-insensitive)
      const searchLower = search.toLowerCase()
      const searchCapitalized = searchLower.charAt(0).toUpperCase() + searchLower.slice(1)
      query = query.or(
        `title.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%,description.ilike.%${search}%,genres.cs.{"${searchCapitalized}"}`
      )
    }
  }

  query = query.range(offset, offset + limit - 1)

  const { data: books, error, count } = await query

  if (error) {
    return jsonError(error.message, 500)
  }

  return jsonSuccess({
    books,
    pagination: createPaginationResponse(page, limit, count || 0),
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin()
  if (isErrorResponse(auth)) return auth

  const { supabase, user } = auth
  const body = await request.json()
  const { title, author, isbn, description, cover_url, page_count, publish_date, genres, enrich_with_ai } = body

  if (!title || !author) {
    return jsonError('Title and author are required', 400)
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
    return jsonError(error.message, 500)
  }

  return jsonSuccess(book, 201)
}
