/**
 * Hardcover API Integration
 * https://docs.hardcover.app/api/getting-started/
 *
 * Provides book ratings, reviews, and reader counts from the Hardcover community
 */

const HARDCOVER_API = 'https://api.hardcover.app/v1/graphql'

export interface HardcoverBookData {
  id: number
  title: string
  slug: string
  rating: number | null
  ratingsCount: number
  reviewsCount: number
  usersReadCount: number
  hardcoverUrl: string
}

interface HardcoverSearchResult {
  id: number
  title: string
  slug: string
  rating: number | null
  ratings_count: number
  reviews_count: number
  users_read_count: number
}

interface HardcoverSearchResponse {
  data?: {
    search?: {
      results: string // JSON string of results
    }
  }
  errors?: Array<{ message: string }>
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

    // Parse the results JSON string
    const resultsJson = data.data?.search?.results
    if (!resultsJson) return null

    const results: HardcoverSearchResult[] = JSON.parse(resultsJson)
    if (!results || results.length === 0) return null

    const book = results[0]

    return {
      id: book.id,
      title: book.title,
      slug: book.slug,
      rating: book.rating,
      ratingsCount: book.ratings_count || 0,
      reviewsCount: book.reviews_count || 0,
      usersReadCount: book.users_read_count || 0,
      hardcoverUrl: `https://hardcover.app/books/${book.slug}`,
    }
  } catch (error) {
    console.error('Failed to fetch from Hardcover:', error)
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

    return {
      id: book.id,
      title: book.title,
      slug: book.slug,
      rating: book.rating,
      ratingsCount: book.ratings_count || 0,
      reviewsCount: book.reviews_count || 0,
      usersReadCount: book.users_read_count || 0,
      hardcoverUrl: `https://hardcover.app/books/${book.slug}`,
    }
  } catch {
    return null
  }
}
