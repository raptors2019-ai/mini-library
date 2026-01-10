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
  LookupBookExternalArgs,
  RequestBookArgs,
  ShowBooksOnPageArgs,
} from './types'
import type { AppAction } from '@/lib/actions/types'
import { createNotification, notificationTemplates } from '@/lib/notifications'

interface ToolExecutionResult {
  success: boolean
  data?: unknown
  books?: Book[]
  error?: string
  action?: AppAction
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
      case 'lookup_book_external':
        return await lookupBookExternal(args as unknown as LookupBookExternalArgs)
      case 'request_book':
        return await requestBook(args as unknown as RequestBookArgs, userId)
      case 'show_books_on_page':
        return showBooksOnPage(args as unknown as ShowBooksOnPageArgs)
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

interface GoogleBooksResult {
  title: string
  author: string
  isbn: string | null
  description: string | null
  cover_url: string | null
  page_count: number | null
  publish_date: string | null
  genres: string[]
}

async function lookupBookExternal(args: LookupBookExternalArgs): Promise<ToolExecutionResult> {
  try {
    // Build Google Books API query
    let query = args.title
    if (args.author) {
      query += `+inauthor:${args.author}`
    }

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
    )

    if (!response.ok) {
      return { success: false, error: 'Failed to search external book database' }
    }

    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return {
        success: true,
        data: {
          found: false,
          message: `No books found matching "${args.title}"${args.author ? ` by ${args.author}` : ''}`,
          results: [],
        },
      }
    }

    // Parse results
    const results: GoogleBooksResult[] = data.items.map((item: { volumeInfo: {
      title?: string
      authors?: string[]
      industryIdentifiers?: Array<{ type: string; identifier: string }>
      description?: string
      imageLinks?: { thumbnail?: string }
      pageCount?: number
      publishedDate?: string
      categories?: string[]
    } }) => {
      const info = item.volumeInfo
      let coverUrl = info.imageLinks?.thumbnail || null
      if (coverUrl) {
        coverUrl = coverUrl.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
      }

      // Get ISBN (prefer ISBN_13)
      const isbn13 = info.industryIdentifiers?.find((id: { type: string }) => id.type === 'ISBN_13')
      const isbn10 = info.industryIdentifiers?.find((id: { type: string }) => id.type === 'ISBN_10')
      const isbn = isbn13?.identifier || isbn10?.identifier || null

      return {
        title: info.title || 'Unknown Title',
        author: info.authors?.join(', ') || 'Unknown Author',
        isbn,
        description: info.description || null,
        cover_url: coverUrl,
        page_count: info.pageCount || null,
        publish_date: info.publishedDate || null,
        genres: info.categories || [],
      }
    })

    return {
      success: true,
      data: {
        found: true,
        message: `Found ${results.length} book(s) matching your search. Please confirm which one you'd like to request.`,
        results,
      },
    }
  } catch (error) {
    console.error('External book lookup error:', error)
    return { success: false, error: 'Failed to search external book database' }
  }
}

async function requestBook(args: RequestBookArgs, userId?: string): Promise<ToolExecutionResult> {
  if (!userId) {
    return {
      success: false,
      error: 'You must be logged in to request books. Please sign in first.',
    }
  }

  const supabase = await createClient()

  // Check if user already has a pending request for this book
  const { data: existing } = await supabase
    .from('book_requests')
    .select('id')
    .eq('user_id', userId)
    .ilike('title', args.title)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return {
      success: false,
      error: `You already have a pending request for "${args.title}". You'll be notified when it's reviewed.`,
    }
  }

  // Create the request with all available details
  const { data: bookRequest, error } = await supabase
    .from('book_requests')
    .insert({
      user_id: userId,
      title: args.title,
      author: args.author,
      isbn: args.isbn || null,
      description: args.description || null,
      cover_url: args.cover_url || null,
      page_count: args.page_count || null,
      publish_date: args.publish_date || null,
      genres: args.genres || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create book request:', error)
    return { success: false, error: 'Failed to submit request. Please try again.' }
  }

  // Get user's name for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()

  const requesterName = profile?.full_name || profile?.email || 'A member'

  // Notify all admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['librarian', 'admin'])

  if (admins?.length) {
    const template = notificationTemplates.adminNewBookRequest(args.title, args.author, requesterName)
    for (const admin of admins) {
      await createNotification({
        supabase,
        userId: admin.id,
        type: template.type,
        title: template.title,
        message: template.message,
      })
    }
  }

  return {
    success: true,
    data: {
      requestId: bookRequest.id,
      title: args.title,
      author: args.author,
      message: `Your request for "${args.title}" by ${args.author} has been submitted! A librarian will review it soon. You'll be notified when it's approved.`,
    },
  }
}

function showBooksOnPage(args: ShowBooksOnPageArgs): ToolExecutionResult {
  // Build the action to send to the client
  const action: AppAction = {
    type: 'apply_filters',
    payload: {
      search: args.search,
      genres: args.genres,
      statuses: args.statuses,
    },
  }

  // Build description for the response
  const filters: string[] = []
  if (args.search) filters.push(`search: "${args.search}"`)
  if (args.genres?.length) filters.push(`genres: ${args.genres.join(', ')}`)
  if (args.statuses?.length) filters.push(`status: ${args.statuses.join(', ')}`)

  const description = filters.length > 0
    ? `Opening books page with ${filters.join(', ')}`
    : 'Opening all books'

  return {
    success: true,
    action,
    data: {
      message: description,
      filters: {
        search: args.search,
        genres: args.genres,
        statuses: args.statuses,
      },
    },
  }
}
