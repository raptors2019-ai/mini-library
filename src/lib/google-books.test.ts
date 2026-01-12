import { getBookCoverUrl, getBooksWithCovers, getBookMetadata } from './google-books'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('getBookCoverUrl', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should return cover URL when found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {
            imageLinks: {
              thumbnail: 'http://books.google.com/books?id=123&zoom=1&edge=curl',
            },
          },
        }],
      }),
    })

    const result = await getBookCoverUrl('9780123456789')
    expect(result).toBe('https://books.google.com/books?id=123&zoom=2')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:9780123456789',
      { next: { revalidate: 86400 } }
    )
  })

  it('should prefer medium quality image over thumbnail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {
            imageLinks: {
              medium: 'http://books.google.com/medium.jpg',
              thumbnail: 'http://books.google.com/thumb.jpg',
            },
          },
        }],
      }),
    })

    const result = await getBookCoverUrl('9780123456789')
    expect(result).toBe('https://books.google.com/medium.jpg')
  })

  it('should return null when no items found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    })

    const result = await getBookCoverUrl('9780123456789')
    expect(result).toBeNull()
  })

  it('should return null when no image links', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {},
        }],
      }),
    })

    const result = await getBookCoverUrl('9780123456789')
    expect(result).toBeNull()
  })

  it('should return null when response not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    })

    const result = await getBookCoverUrl('9780123456789')
    expect(result).toBeNull()
  })

  it('should return null when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await getBookCoverUrl('9780123456789')
    expect(result).toBeNull()
  })
})

describe('getBooksWithCovers', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should return existing cover URLs without fetching', async () => {
    const books = [
      { id: '1', isbn: '123', cover_url: 'existing-url.jpg' },
    ]

    const result = await getBooksWithCovers(books)
    expect(result.get('1')).toBe('existing-url.jpg')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should fetch covers for books without cover_url', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {
            imageLinks: { thumbnail: 'http://books.google.com/thumb.jpg' },
          },
        }],
      }),
    })

    const books = [
      { id: '1', isbn: '9780123456789', cover_url: null },
    ]

    const result = await getBooksWithCovers(books)
    expect(result.get('1')).toBe('https://books.google.com/thumb.jpg')
  })

  it('should skip books without ISBN', async () => {
    const books = [
      { id: '1', isbn: null, cover_url: null },
    ]

    const result = await getBooksWithCovers(books)
    expect(result.has('1')).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should handle mixed books with and without covers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {
            imageLinks: { thumbnail: 'http://books.google.com/new-cover.jpg' },
          },
        }],
      }),
    })

    const books = [
      { id: '1', isbn: '111', cover_url: 'existing.jpg' },
      { id: '2', isbn: '222', cover_url: null },
      { id: '3', isbn: null, cover_url: null },
    ]

    const result = await getBooksWithCovers(books)
    expect(result.get('1')).toBe('existing.jpg')
    expect(result.get('2')).toBe('https://books.google.com/new-cover.jpg')
    expect(result.has('3')).toBe(false)
  })

  it('should handle fetch failures gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const books = [
      { id: '1', isbn: '123', cover_url: null },
    ]

    const result = await getBooksWithCovers(books)
    expect(result.has('1')).toBe(false)
  })
})

describe('getBookMetadata', () => {
  const originalEnv = process.env

  beforeEach(() => {
    mockFetch.mockClear()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return metadata when found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {
            averageRating: 4.5,
            ratingsCount: 100,
            previewLink: 'http://books.google.com/preview',
            publisher: 'Test Publisher',
          },
        }],
      }),
    })

    const result = await getBookMetadata('9780123456789')
    expect(result).toEqual({
      averageRating: 4.5,
      ratingsCount: 100,
      previewLink: 'https://www.google.com/search?tbm=bks&q=isbn:9780123456789',
      publisher: 'Test Publisher',
    })
  })

  it('should use API key when available', async () => {
    process.env.GOOGLE_BOOKS_API_KEY = 'test-api-key'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {
            averageRating: 4.0,
          },
        }],
      }),
    })

    await getBookMetadata('9780123456789')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:9780123456789&key=test-api-key',
      { next: { revalidate: 86400 } }
    )
  })

  it('should return null values for missing fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          volumeInfo: {},
        }],
      }),
    })

    const result = await getBookMetadata('9780123456789')
    expect(result).toEqual({
      averageRating: null,
      ratingsCount: null,
      previewLink: 'https://www.google.com/search?tbm=bks&q=isbn:9780123456789',
      publisher: null,
    })
  })

  it('should return null when no items found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const result = await getBookMetadata('9780123456789')
    expect(result).toBeNull()
  })

  it('should return null when response not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    })

    const result = await getBookMetadata('9780123456789')
    expect(result).toBeNull()
  })

  it('should return null when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await getBookMetadata('9780123456789')
    expect(result).toBeNull()
  })
})
