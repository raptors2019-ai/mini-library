import {
  getHardcoverBookData,
  getHardcoverBookByTitleAuthor,
  getHardcoverBookById,
  getHardcoverReviews,
  findHardcoverBook,
} from './hardcover'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('getHardcoverBookData', () => {
  const originalEnv = process.env

  beforeEach(() => {
    mockFetch.mockClear()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return null when API token not configured', async () => {
    delete process.env.HARDCOVER_API_TOKEN
    const result = await getHardcoverBookData('9780123456789')
    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should return book data when found with matching ISBN', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [{
                document: {
                  id: '123',
                  title: 'Test Book',
                  slug: 'test-book',
                  rating: 4.5,
                  ratings_count: 100,
                  reviews_count: 50,
                  users_read_count: 200,
                  isbns: ['9780123456789'],
                },
              }],
            },
          },
        },
      }),
    })

    const result = await getHardcoverBookData('978-0-123456-78-9')
    expect(result).toEqual({
      id: 123,
      title: 'Test Book',
      slug: 'test-book',
      rating: 4.5,
      ratingsCount: 100,
      reviewsCount: 50,
      usersReadCount: 200,
      hardcoverUrl: 'https://hardcover.app/books/test-book',
    })
  })

  it('should clean ISBN by removing hyphens', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [],
            },
          },
        },
      }),
    })

    await getHardcoverBookData('978-0-123456-78-9')
    const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(calledBody.query).toContain('9780123456789')
  })

  it('should return null when ISBN does not match', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [{
                document: {
                  id: '123',
                  title: 'Different Book',
                  slug: 'different-book',
                  rating: 4.0,
                  ratings_count: 50,
                  reviews_count: 25,
                  users_read_count: 100,
                  isbns: ['9789999999999'], // Different ISBN
                },
              }],
            },
          },
        },
      }),
    })

    const result = await getHardcoverBookData('9780123456789')
    expect(result).toBeNull()
  })

  it('should return null when no hits found', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [],
            },
          },
        },
      }),
    })

    const result = await getHardcoverBookData('9780123456789')
    expect(result).toBeNull()
  })

  it('should return null when API returns error response', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const result = await getHardcoverBookData('9780123456789')
    expect(result).toBeNull()
  })

  it('should return null when GraphQL errors returned', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        errors: [{ message: 'GraphQL error' }],
      }),
    })

    const result = await getHardcoverBookData('9780123456789')
    expect(result).toBeNull()
  })

  it('should return null when fetch throws', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await getHardcoverBookData('9780123456789')
    expect(result).toBeNull()
  })

  it('should handle book with no isbns field', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [{
                document: {
                  id: '123',
                  title: 'Test Book',
                  slug: 'test-book',
                  rating: 4.5,
                  ratings_count: 100,
                  reviews_count: 50,
                  users_read_count: 200,
                  // no isbns field
                },
              }],
            },
          },
        },
      }),
    })

    const result = await getHardcoverBookData('9780123456789')
    expect(result).toBeNull()
  })
})

describe('getHardcoverBookByTitleAuthor', () => {
  const originalEnv = process.env

  beforeEach(() => {
    mockFetch.mockClear()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return null when API token not configured', async () => {
    delete process.env.HARDCOVER_API_TOKEN
    const result = await getHardcoverBookByTitleAuthor('Test Book', 'Test Author')
    expect(result).toBeNull()
  })

  it('should return book data when found', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [{
                document: {
                  id: '123',
                  title: 'Test Book',
                  slug: 'test-book',
                  rating: 4.5,
                  ratings_count: 100,
                  reviews_count: 50,
                  users_read_count: 200,
                },
              }],
            },
          },
        },
      }),
    })

    const result = await getHardcoverBookByTitleAuthor('Test Book', 'Test Author')
    expect(result?.title).toBe('Test Book')
  })

  it('should prioritize exact title match', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [
                {
                  document: {
                    id: '1',
                    title: 'Test Book: Extended Edition',
                    slug: 'test-book-extended',
                    rating: 4.0,
                    ratings_count: 50,
                    reviews_count: 25,
                    users_read_count: 100,
                  },
                },
                {
                  document: {
                    id: '2',
                    title: 'Test Book',
                    slug: 'test-book',
                    rating: 4.5,
                    ratings_count: 100,
                    reviews_count: 50,
                    users_read_count: 200,
                  },
                },
              ],
            },
          },
        },
      }),
    })

    const result = await getHardcoverBookByTitleAuthor('Test Book', 'Test Author')
    expect(result?.slug).toBe('test-book')
  })

  it('should return shortest matching title when no exact match', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [
                {
                  document: {
                    id: '1',
                    title: 'The Test Book: A Very Long Subtitle',
                    slug: 'test-book-long',
                    rating: 4.0,
                    ratings_count: 50,
                    reviews_count: 25,
                    users_read_count: 100,
                  },
                },
                {
                  document: {
                    id: '2',
                    title: 'The Test Book',
                    slug: 'test-book-short',
                    rating: 4.5,
                    ratings_count: 100,
                    reviews_count: 50,
                    users_read_count: 200,
                  },
                },
              ],
            },
          },
        },
      }),
    })

    const result = await getHardcoverBookByTitleAuthor('Test Book', 'Test Author')
    expect(result?.slug).toBe('test-book-short')
  })

  it('should return first result when no title matches', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [
                {
                  document: {
                    id: '1',
                    title: 'Completely Different Book',
                    slug: 'different-book',
                    rating: 4.0,
                    ratings_count: 50,
                    reviews_count: 25,
                    users_read_count: 100,
                  },
                },
              ],
            },
          },
        },
      }),
    })

    const result = await getHardcoverBookByTitleAuthor('Test Book', 'Test Author')
    expect(result?.slug).toBe('different-book')
  })

  it('should escape quotes in search query', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { search: { results: { hits: [] } } },
      }),
    })

    await getHardcoverBookByTitleAuthor('Book with "quotes"', 'Author')
    const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(calledBody.query).toContain('Book with \\"quotes\\"')
  })

  it('should return null when API returns error', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: false,
    })

    const result = await getHardcoverBookByTitleAuthor('Test Book', 'Test Author')
    expect(result).toBeNull()
  })

  it('should return null when GraphQL errors', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        errors: [{ message: 'Error' }],
      }),
    })

    const result = await getHardcoverBookByTitleAuthor('Test Book', 'Test Author')
    expect(result).toBeNull()
  })

  it('should return null when fetch throws', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await getHardcoverBookByTitleAuthor('Test Book', 'Test Author')
    expect(result).toBeNull()
  })
})

describe('getHardcoverBookById', () => {
  const originalEnv = process.env

  beforeEach(() => {
    mockFetch.mockClear()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return null when API token not configured', async () => {
    delete process.env.HARDCOVER_API_TOKEN
    const result = await getHardcoverBookById(123)
    expect(result).toBeNull()
  })

  it('should return book data when found', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          books: [{
            id: 123,
            title: 'Test Book',
            slug: 'test-book',
            rating: 4.5,
            ratings_count: 100,
            reviews_count: 50,
            users_read_count: 200,
          }],
        },
      }),
    })

    const result = await getHardcoverBookById(123)
    expect(result?.id).toBe(123)
    expect(result?.title).toBe('Test Book')
  })

  it('should return null when book not found', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          books: [],
        },
      }),
    })

    const result = await getHardcoverBookById(123)
    expect(result).toBeNull()
  })

  it('should return null when API returns error', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: false,
    })

    const result = await getHardcoverBookById(123)
    expect(result).toBeNull()
  })

  it('should return null when fetch throws', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await getHardcoverBookById(123)
    expect(result).toBeNull()
  })

  it('should handle null counts', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          books: [{
            id: 123,
            title: 'Test Book',
            slug: 'test-book',
            rating: null,
            ratings_count: null,
            reviews_count: null,
            users_read_count: null,
          }],
        },
      }),
    })

    const result = await getHardcoverBookById(123)
    expect(result?.ratingsCount).toBe(0)
    expect(result?.reviewsCount).toBe(0)
    expect(result?.usersReadCount).toBe(0)
  })
})

describe('getHardcoverReviews', () => {
  const originalEnv = process.env

  beforeEach(() => {
    mockFetch.mockClear()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return empty array when API token not configured', async () => {
    delete process.env.HARDCOVER_API_TOKEN
    const result = await getHardcoverReviews('test-book')
    expect(result).toEqual([])
  })

  it('should return reviews when found', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          books: [{
            user_books: [
              {
                review: 'Great book!',
                rating: 5,
                created_at: '2024-01-01T00:00:00Z',
                user: {
                  username: 'reader1',
                  name: 'Reader One',
                },
              },
              {
                review: 'Pretty good',
                rating: 4,
                created_at: '2024-01-02T00:00:00Z',
                user: {
                  username: 'reader2',
                  name: null,
                },
              },
            ],
          }],
        },
      }),
    })

    const result = await getHardcoverReviews('test-book')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      review: 'Great book!',
      rating: 5,
      createdAt: '2024-01-01T00:00:00Z',
      user: {
        username: 'reader1',
        name: 'Reader One',
      },
    })
  })

  it('should return empty array when no reviews', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          books: [{
            user_books: [],
          }],
        },
      }),
    })

    const result = await getHardcoverReviews('test-book')
    expect(result).toEqual([])
  })

  it('should return empty array when API returns error', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: false,
    })

    const result = await getHardcoverReviews('test-book')
    expect(result).toEqual([])
  })

  it('should return empty array when fetch throws', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await getHardcoverReviews('test-book')
    expect(result).toEqual([])
  })

  it('should handle null user fields', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          books: [{
            user_books: [
              {
                review: 'Great book!',
                rating: 5,
                created_at: '2024-01-01T00:00:00Z',
                user: null,
              },
            ],
          }],
        },
      }),
    })

    const result = await getHardcoverReviews('test-book')
    expect(result[0].user).toEqual({
      username: null,
      name: null,
    })
  })

  it('should respect custom limit', async () => {
    process.env.HARDCOVER_API_TOKEN = 'test-token'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { books: [{ user_books: [] }] },
      }),
    })

    await getHardcoverReviews('test-book', 10)
    const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(calledBody.query).toContain('limit: 10')
  })
})

describe('findHardcoverBook', () => {
  const originalEnv = process.env

  beforeEach(() => {
    mockFetch.mockClear()
    process.env = { ...originalEnv, HARDCOVER_API_TOKEN: 'test-token' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should try ISBN first when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [{
                document: {
                  id: '123',
                  title: 'Test Book',
                  slug: 'test-book',
                  rating: 4.5,
                  ratings_count: 100,
                  reviews_count: 50,
                  users_read_count: 200,
                  isbns: ['9780123456789'],
                },
              }],
            },
          },
        },
      }),
    })

    const result = await findHardcoverBook({ isbn: '9780123456789', title: 'Test Book', author: 'Author' })
    expect(result?.title).toBe('Test Book')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should fall back to title/author when ISBN fails', async () => {
    // First call (ISBN) returns no match
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { search: { results: { hits: [] } } },
      }),
    })

    // Second call (title/author) returns match
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [{
                document: {
                  id: '123',
                  title: 'Test Book',
                  slug: 'test-book',
                  rating: 4.5,
                  ratings_count: 100,
                  reviews_count: 50,
                  users_read_count: 200,
                },
              }],
            },
          },
        },
      }),
    })

    const result = await findHardcoverBook({ isbn: '9780123456789', title: 'Test Book', author: 'Author' })
    expect(result?.title).toBe('Test Book')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should use title/author directly when no ISBN', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          search: {
            results: {
              hits: [{
                document: {
                  id: '123',
                  title: 'Test Book',
                  slug: 'test-book',
                  rating: 4.5,
                  ratings_count: 100,
                  reviews_count: 50,
                  users_read_count: 200,
                },
              }],
            },
          },
        },
      }),
    })

    const result = await findHardcoverBook({ title: 'Test Book', author: 'Author' })
    expect(result?.title).toBe('Test Book')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should return null when only ISBN provided and not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { search: { results: { hits: [] } } },
      }),
    })

    const result = await findHardcoverBook({ isbn: '9780123456789' })
    expect(result).toBeNull()
  })

  it('should return null when no identifiers provided', async () => {
    const result = await findHardcoverBook({})
    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
