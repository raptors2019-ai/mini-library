import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/openai'
import { GENRES } from '@/lib/constants'
import type { Book } from '@/types/database'
import type {
  SearchBooksArgs,
  GetBookDetailsArgs,
  CheckAvailabilityArgs,
  GetRecommendationsArgs,
  FindSimilarBooksArgs,
} from './types'

interface ToolExecutionResult {
  success: boolean
  data?: unknown
  books?: Book[]
  error?: string
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId?: string
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'search_books':
        return await searchBooks(args as unknown as SearchBooksArgs)
      case 'get_book_details':
        return await getBookDetails(args as unknown as GetBookDetailsArgs)
      case 'check_availability':
        return await checkAvailability(args as unknown as CheckAvailabilityArgs)
      case 'get_recommendations':
        return await getRecommendations(args as unknown as GetRecommendationsArgs, userId)
      case 'find_similar_books':
        return await findSimilarBooks(args as unknown as FindSimilarBooksArgs)
      case 'get_available_genres':
        return getAvailableGenres()
      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    }
  }
}

async function searchBooks(args: SearchBooksArgs): Promise<ToolExecutionResult> {
  const supabase = await createClient()
  const limit = Math.min(args.limit || 5, 10)

  // Try semantic search first
  try {
    const embedding = await generateEmbedding(args.query)
    const { data: semanticResults, error: rpcError } = await supabase.rpc('match_books', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: limit,
    })

    if (!rpcError && semanticResults?.length > 0) {
      let books = semanticResults as Book[]

      // Apply optional filters
      if (args.author) {
        const authorLower = args.author.toLowerCase()
        books = books.filter((b) => b.author.toLowerCase().includes(authorLower))
      }
      if (args.genre) {
        const genreLower = args.genre.toLowerCase()
        books = books.filter((b) =>
          b.genres?.some((g) => g.toLowerCase().includes(genreLower))
        )
      }

      return {
        success: true,
        books,
        data: {
          searchType: 'semantic',
          query: args.query,
          resultCount: books.length,
        },
      }
    }
  } catch {
    // Fall through to text search
  }

  // Fallback to text search
  let query = supabase
    .from('books')
    .select('*')
    .neq('status', 'inactive')
    .limit(limit)

  // Split query into words and search for any word matching
  const words = args.query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 3) // Ignore short words like "by", "of", etc.

  if (words.length > 0) {
    // Build OR conditions for each word across title, author, description, and genres
    const conditions = words.flatMap((word) => [
      `title.ilike.%${word}%`,
      `author.ilike.%${word}%`,
      `description.ilike.%${word}%`,
      `genres.cs.{"${word.charAt(0).toUpperCase() + word.slice(1)}"}`, // Case-sensitive array contains for genres
    ])
    query = query.or(conditions.join(','))
  } else {
    // If no meaningful words, search with original query
    query = query.or(
      `title.ilike.%${args.query}%,author.ilike.%${args.query}%,description.ilike.%${args.query}%`
    )
  }

  if (args.author) {
    query = query.ilike('author', `%${args.author}%`)
  }
  if (args.genre) {
    query = query.contains('genres', [args.genre])
  }

  const { data: textResults, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    books: textResults || [],
    data: {
      searchType: 'text',
      query: args.query,
      resultCount: textResults?.length || 0,
    },
  }
}

async function getBookDetails(args: GetBookDetailsArgs): Promise<ToolExecutionResult> {
  const supabase = await createClient()

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', args.book_id)
    .single()

  if (error || !book) {
    return { success: false, error: 'Book not found' }
  }

  // Get waitlist count
  const { count: waitlistCount } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', args.book_id)
    .eq('status', 'waiting')

  // Get current checkout if checked out
  let currentCheckout = null
  if (book.status === 'checked_out') {
    const { data: checkout } = await supabase
      .from('checkouts')
      .select('due_date')
      .eq('book_id', args.book_id)
      .eq('status', 'active')
      .single()
    currentCheckout = checkout
  }

  return {
    success: true,
    books: [book],
    data: {
      book,
      waitlistCount: waitlistCount || 0,
      currentCheckout,
    },
  }
}

async function checkAvailability(args: CheckAvailabilityArgs): Promise<ToolExecutionResult> {
  const supabase = await createClient()

  const { data: book, error } = await supabase
    .from('books')
    .select('id, title, author, status')
    .eq('id', args.book_id)
    .single()

  if (error || !book) {
    return { success: false, error: 'Book not found' }
  }

  const isAvailable = book.status === 'available'

  // Get additional info based on status
  let dueDate = null
  let waitlistCount = 0

  if (!isAvailable) {
    // Get due date
    const { data: checkout } = await supabase
      .from('checkouts')
      .select('due_date')
      .eq('book_id', args.book_id)
      .eq('status', 'active')
      .single()
    dueDate = checkout?.due_date

    // Get waitlist count
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', args.book_id)
      .eq('status', 'waiting')
    waitlistCount = count || 0
  }

  return {
    success: true,
    data: {
      bookId: book.id,
      title: book.title,
      author: book.author,
      isAvailable,
      status: book.status,
      dueDate,
      waitlistCount,
    },
  }
}

async function getRecommendations(
  args: GetRecommendationsArgs,
  userId?: string
): Promise<ToolExecutionResult> {
  const supabase = await createClient()
  const limit = args.limit || 5
  const type = args.type || 'for-you'

  // For personalized recommendations, need user
  if (type === 'for-you' && userId) {
    // Get user's taste embedding
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('taste_embedding, favorite_genres')
      .eq('user_id', userId)
      .single()

    if (prefs?.taste_embedding) {
      // Get user's read books to exclude
      const { data: userBooks } = await supabase
        .from('user_books')
        .select('book_id')
        .eq('user_id', userId)

      const readBookIds = userBooks?.map((ub) => ub.book_id) || []

      // Semantic search with taste embedding
      const { data: recommendations } = await supabase.rpc('match_books', {
        query_embedding: prefs.taste_embedding,
        match_threshold: 0.3,
        match_count: limit + readBookIds.length,
      })

      if (recommendations) {
        const filtered = (recommendations as Book[])
          .filter((b) => !readBookIds.includes(b.id))
          .slice(0, limit)

        return {
          success: true,
          books: filtered,
          data: { type: 'personalized', count: filtered.length },
        }
      }
    }

    // Fallback to genre-based if no taste embedding
    if (prefs?.favorite_genres?.length) {
      const { data: genreBooks } = await supabase
        .from('books')
        .select('*')
        .neq('status', 'inactive')
        .overlaps('genres', prefs.favorite_genres)
        .limit(limit)

      return {
        success: true,
        books: genreBooks || [],
        data: { type: 'genre-based', count: genreBooks?.length || 0 },
      }
    }
  }

  // Popular/new books or fallback
  let query = supabase.from('books').select('*').neq('status', 'inactive')

  if (type === 'new') {
    query = query.order('created_at', { ascending: false })
  } else {
    // Popular - just get available books for now
    query = query.eq('status', 'available')
  }

  const { data: books } = await query.limit(limit)

  return {
    success: true,
    books: books || [],
    data: { type: type === 'new' ? 'new-arrivals' : 'popular', count: books?.length || 0 },
  }
}

async function findSimilarBooks(args: FindSimilarBooksArgs): Promise<ToolExecutionResult> {
  const supabase = await createClient()
  const limit = args.limit || 5

  // Try RPC function first
  try {
    const { data: similar, error } = await supabase.rpc('find_similar_books', {
      book_id: args.book_id,
      match_count: limit,
    })

    if (!error && similar?.length > 0) {
      return {
        success: true,
        books: similar as Book[],
        data: { type: 'semantic-similarity', count: similar.length },
      }
    }
  } catch {
    // Fall through to genre-based
  }

  // Fallback: genre-based similarity
  const { data: sourceBook } = await supabase
    .from('books')
    .select('genres')
    .eq('id', args.book_id)
    .single()

  if (!sourceBook?.genres?.length) {
    return { success: false, error: 'Source book not found or has no genres' }
  }

  const { data: similarBooks } = await supabase
    .from('books')
    .select('*')
    .neq('id', args.book_id)
    .neq('status', 'inactive')
    .overlaps('genres', sourceBook.genres)
    .limit(limit)

  return {
    success: true,
    books: similarBooks || [],
    data: { type: 'genre-based', count: similarBooks?.length || 0 },
  }
}

function getAvailableGenres(): ToolExecutionResult {
  return {
    success: true,
    data: {
      genres: GENRES,
      count: GENRES.length,
    },
  }
}
