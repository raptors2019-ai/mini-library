/**
 * Hardcover API Integration
 * https://docs.hardcover.app/api/getting-started/
 *
 * Provides book ratings, reviews, and reader counts from the Hardcover community
 */

const HARDCOVER_API = 'https://api.hardcover.app/v1/graphql'

export interface HardcoverReview {
  review: string
  rating: number | null
  createdAt: string
  user: {
    username: string | null
    name: string | null
  }
}

export interface HardcoverBookData {
  id: number
  title: string
  slug: string
  rating: number | null
  ratingsCount: number
  reviewsCount: number
  usersReadCount: number
  hardcoverUrl: string
  reviews?: HardcoverReview[]
}

interface HardcoverDocument {
  id: string
  title: string
  slug: string
  rating: number | null
  ratings_count: number
  reviews_count: number
  users_read_count: number
  isbns?: string[]
}

interface HardcoverSearchResponse {
  data?: {
    search?: {
      results: {
        hits?: Array<{
          document: HardcoverDocument
        }>
      }
    }
  }
  errors?: Array<{ message: string }>
}

/**
 * Transform a Hardcover document to HardcoverBookData
 */
function toBookData(doc: HardcoverDocument): HardcoverBookData {
  return {
    id: parseInt(doc.id),
    title: doc.title,
    slug: doc.slug,
    rating: doc.rating,
    ratingsCount: doc.ratings_count || 0,
    reviewsCount: doc.reviews_count || 0,
    usersReadCount: doc.users_read_count || 0,
    hardcoverUrl: `https://hardcover.app/books/${doc.slug}`,
  }
}

/**
 * Search for a book on Hardcover by ISBN and return ratings/reviews data
 * @param isbn - The book's ISBN (10 or 13 digit)
 * @returns Book data with ratings or null if not found
 */
export async function getHardcoverBookData(isbn: string): Promise<HardcoverBookData | null> {
  const apiToken = process.env.HARDCOVER_API_TOKEN

  if (!apiToken) {
    console.warn('HARDCOVER_API_TOKEN not configured')
    return null
  }

  // Clean ISBN - remove hyphens
  const cleanIsbn = isbn.replace(/-/g, '')

  const query = `
    query SearchByISBN {
      search(
        query: "${cleanIsbn}",
        query_type: "Book",
        per_page: 1,
        page: 1
      ) {
        results
      }
    }
  `

  try {
    const response = await fetch(HARDCOVER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
      console.error('Hardcover API error:', response.status)
      return null
    }

    const data: HardcoverSearchResponse = await response.json()

    if (data.errors) {
      console.error('Hardcover GraphQL errors:', data.errors)
      return null
    }

    // Get the first hit from results
    const hits = data.data?.search?.results?.hits
    if (!hits || hits.length === 0) return null

    const book = hits[0].document

    // Verify the ISBN matches (search can return partial matches)
    const bookIsbns = book.isbns?.map(i => i.replace(/-/g, '')) || []
    if (!bookIsbns.includes(cleanIsbn)) {
      // ISBN doesn't match, likely a false positive from search
      return null
    }

    return toBookData(book)
  } catch (error) {
    console.error('Failed to fetch from Hardcover:', error)
    return null
  }
}

/**
 * Find book data on Hardcover using ISBN first, then falling back to title/author
 * This is the recommended entry point for looking up any book
 * @param book - Object with isbn, title, and author properties
 * @returns Book data with ratings or null if not found
 */
export async function findHardcoverBook(book: {
  isbn?: string | null
  title?: string | null
  author?: string | null
}): Promise<HardcoverBookData | null> {
  // Try ISBN first if available
  if (book.isbn) {
    const byIsbn = await getHardcoverBookData(book.isbn)
    if (byIsbn) return byIsbn
  }

  // Fall back to title/author search
  if (book.title && book.author) {
    return getHardcoverBookByTitleAuthor(book.title, book.author)
  }

  return null
}

/**
 * Search for a book on Hardcover by title and author (fallback when ISBN doesn't match)
 * @param title - The book's title
 * @param author - The book's author
 * @returns Book data with ratings or null if not found
 */
export async function getHardcoverBookByTitleAuthor(
  title: string,
  author: string
): Promise<HardcoverBookData | null> {
  const apiToken = process.env.HARDCOVER_API_TOKEN

  if (!apiToken) {
    return null
  }

  // Search by "title author" to improve match accuracy
  const searchQuery = `${title} ${author}`.replace(/"/g, '\\"')

  const query = `
    query SearchByTitle {
      search(
        query: "${searchQuery}",
        query_type: "Book",
        per_page: 5,
        page: 1
      ) {
        results
      }
    }
  `

  try {
    const response = await fetch(HARDCOVER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 86400 }
    })

    if (!response.ok) return null

    const data: HardcoverSearchResponse = await response.json()

    if (data.errors) return null

    const hits = data.data?.search?.results?.hits
    if (!hits || hits.length === 0) return null

    // Find the best match - prioritize exact title match, then shortest title containing our title
    const normalizedTitle = title.toLowerCase().trim()

    // First, look for exact title match
    const exactMatch = hits.find(hit =>
      hit.document.title.toLowerCase().trim() === normalizedTitle
    )
    if (exactMatch) {
      return toBookData(exactMatch.document)
    }

    // Otherwise, find the shortest title that contains our search (likely the main book, not reviews/adaptations)
    const matchingHits = hits.filter(hit => {
      const hitTitle = hit.document.title.toLowerCase()
      return hitTitle.includes(normalizedTitle) || normalizedTitle.includes(hitTitle)
    })

    // Sort by title length (shorter = more likely to be the main book)
    const bestMatch = matchingHits.length > 0
      ? matchingHits.sort((a, b) => a.document.title.length - b.document.title.length)[0]
      : hits[0]

    return toBookData(bestMatch.document)
  } catch {
    return null
  }
}

/**
 * Get detailed book data by Hardcover book ID
 * Use this when you already have the Hardcover ID from a previous search
 */
export async function getHardcoverBookById(bookId: number): Promise<HardcoverBookData | null> {
  const apiToken = process.env.HARDCOVER_API_TOKEN

  if (!apiToken) {
    return null
  }

  const query = `
    query GetBook {
      books(where: {id: {_eq: ${bookId}}}) {
        id
        title
        slug
        rating
        ratings_count
        reviews_count
        users_read_count
      }
    }
  `

  try {
    const response = await fetch(HARDCOVER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 86400 }
    })

    if (!response.ok) return null

    const data = await response.json()
    const book = data.data?.books?.[0]

    if (!book) return null

    // Convert to document format for toBookData
    return toBookData({
      id: String(book.id),
      title: book.title,
      slug: book.slug,
      rating: book.rating,
      ratings_count: book.ratings_count || 0,
      reviews_count: book.reviews_count || 0,
      users_read_count: book.users_read_count || 0,
    })
  } catch {
    return null
  }
}

/**
 * Get reviews for a book from Hardcover by slug
 * @param slug - The Hardcover book slug
 * @param limit - Number of reviews to fetch (default 5)
 */
export async function getHardcoverReviews(
  slug: string,
  limit: number = 5
): Promise<HardcoverReview[]> {
  const apiToken = process.env.HARDCOVER_API_TOKEN

  if (!apiToken) {
    return []
  }

  const query = `
    query GetBookReviews {
      books(where: {slug: {_eq: "${slug}"}}, limit: 1) {
        user_books(
          limit: ${limit},
          where: {review: {_neq: ""}},
          order_by: {created_at: desc}
        ) {
          review
          rating
          created_at
          user {
            username
            name
          }
        }
      }
    }
  `

  try {
    const response = await fetch(HARDCOVER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) return []

    const data = await response.json()
    const userBooks = data.data?.books?.[0]?.user_books

    if (!userBooks || userBooks.length === 0) return []

    return userBooks.map((ub: { review: string; rating: number | null; created_at: string; user: { username: string | null; name: string | null } }) => ({
      review: ub.review,
      rating: ub.rating,
      createdAt: ub.created_at,
      user: {
        username: ub.user?.username || null,
        name: ub.user?.name || null,
      },
    }))
  } catch {
    return []
  }
}
