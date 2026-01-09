import { NextRequest, NextResponse } from 'next/server'

interface GoogleBooksVolume {
  volumeInfo: {
    title: string
    authors?: string[]
    description?: string
    pageCount?: number
    publishedDate?: string
    categories?: string[]
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
    industryIdentifiers?: Array<{
      type: string
      identifier: string
    }>
  }
}

interface GoogleBooksResponse {
  totalItems: number
  items?: GoogleBooksVolume[]
}

interface RouteParams {
  params: Promise<{ isbn: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { isbn } = await params

  // Clean ISBN (remove hyphens and spaces)
  const cleanIsbn = isbn.replace(/[-\s]/g, '')

  if (!/^(\d{10}|\d{13})$/.test(cleanIsbn)) {
    return NextResponse.json({ error: 'Invalid ISBN format' }, { status: 400 })
  }

  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    const baseUrl = 'https://www.googleapis.com/books/v1/volumes'
    const url = apiKey
      ? `${baseUrl}?q=isbn:${cleanIsbn}&key=${apiKey}`
      : `${baseUrl}?q=isbn:${cleanIsbn}`

    const response = await fetch(url)
    const data: GoogleBooksResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const book = data.items[0].volumeInfo

    // Get the best available cover image
    let coverUrl = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || null
    if (coverUrl) {
      // Convert to HTTPS and get larger image
      coverUrl = coverUrl.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
    }

    return NextResponse.json({
      isbn: cleanIsbn,
      title: book.title,
      author: book.authors?.join(', ') || 'Unknown',
      description: book.description || null,
      page_count: book.pageCount || null,
      publish_date: book.publishedDate || null,
      genres: book.categories || [],
      cover_url: coverUrl
    })
  } catch (error) {
    console.error('Google Books API error:', error)
    return NextResponse.json({ error: 'Failed to fetch book data' }, { status: 500 })
  }
}
