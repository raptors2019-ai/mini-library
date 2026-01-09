const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'

interface GoogleBooksResponse {
  items?: Array<{
    volumeInfo: {
      imageLinks?: {
        thumbnail?: string
        smallThumbnail?: string
        medium?: string
        large?: string
      }
    }
  }>
}

/**
 * Fetches a book cover URL from Google Books API using ISBN
 * @param isbn - The book's ISBN (10 or 13 digit)
 * @returns Cover URL or null if not found
 */
export async function getBookCoverUrl(isbn: string): Promise<string | null> {
  try {
    const response = await fetch(`${GOOGLE_BOOKS_API}?q=isbn:${isbn}`, {
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) return null

    const data: GoogleBooksResponse = await response.json()

    // Try to get the best quality image available
    const imageLinks = data.items?.[0]?.volumeInfo?.imageLinks
    const coverUrl = imageLinks?.medium || imageLinks?.thumbnail || imageLinks?.smallThumbnail

    if (!coverUrl) return null

    // Convert http to https and remove zoom parameter for better quality
    return coverUrl
      .replace('http://', 'https://')
      .replace('&edge=curl', '')
      .replace('zoom=1', 'zoom=2')
  } catch {
    return null
  }
}

/**
 * Batch fetch cover URLs for multiple books
 * @param books - Array of books with isbn and cover_url fields
 * @returns Map of book ID to cover URL
 */
export async function getBooksWithCovers(
  books: Array<{ id: string; isbn: string | null; cover_url: string | null }>
): Promise<Map<string, string>> {
  const coverMap = new Map<string, string>()

  // First, add existing cover URLs
  for (const book of books) {
    if (book.cover_url) {
      coverMap.set(book.id, book.cover_url)
    }
  }

  // Then fetch missing covers from Google Books
  const booksNeedingCovers = books.filter(b => !b.cover_url && b.isbn)

  const coverPromises = booksNeedingCovers.map(async (book) => {
    const coverUrl = await getBookCoverUrl(book.isbn!)
    if (coverUrl) {
      return { id: book.id, url: coverUrl }
    }
    return null
  })

  const results = await Promise.allSettled(coverPromises)

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      coverMap.set(result.value.id, result.value.url)
    }
  }

  return coverMap
}
