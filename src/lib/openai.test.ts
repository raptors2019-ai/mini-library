import {
  getOpenAIClient,
  generateEmbedding,
  generateBookSummary,
  generateGenres,
  generateReviewSummary,
  createEmbeddingText,
} from './openai'

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn(),
    },
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }))
})

describe('getOpenAIClient', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    // Clear the module cache to reset the singleton
    jest.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should throw error when OPENAI_API_KEY is not set', () => {
    delete process.env.OPENAI_API_KEY
    // Re-import to get fresh module without cached client
    const { getOpenAIClient: freshGetClient } = require('./openai')
    expect(() => freshGetClient()).toThrow('OPENAI_API_KEY environment variable is not set')
  })

  it('should return OpenAI client when API key is set', () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const { getOpenAIClient: freshGetClient } = require('./openai')
    const client = freshGetClient()
    expect(client).toBeDefined()
  })

  it('should return the same client instance (singleton)', () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const { getOpenAIClient: freshGetClient } = require('./openai')
    const client1 = freshGetClient()
    const client2 = freshGetClient()
    expect(client1).toBe(client2)
  })
})

describe('generateEmbedding', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key' }
    jest.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should call OpenAI embeddings API and return embedding', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3]
    const OpenAI = require('openai')
    OpenAI.mockImplementation(() => ({
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: mockEmbedding }],
        }),
      },
    }))

    const { generateEmbedding: freshGenerateEmbedding } = require('./openai')
    const result = await freshGenerateEmbedding('test text')
    expect(result).toEqual(mockEmbedding)
  })
})

describe('generateBookSummary', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key' }
    jest.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should generate summary for book with all fields', async () => {
    const OpenAI = require('openai')
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'A compelling story about...' } }],
          }),
        },
      },
    }))

    const { generateBookSummary: freshGenerateBookSummary } = require('./openai')
    const result = await freshGenerateBookSummary({
      title: 'Test Book',
      author: 'Test Author',
      description: 'A test description',
      genres: ['Fiction', 'Mystery'],
    })
    expect(result).toBe('A compelling story about...')
  })

  it('should handle book without description or genres', async () => {
    const OpenAI = require('openai')
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Summary text' } }],
          }),
        },
      },
    }))

    const { generateBookSummary: freshGenerateBookSummary } = require('./openai')
    const result = await freshGenerateBookSummary({
      title: 'Test Book',
      author: 'Test Author',
    })
    expect(result).toBe('Summary text')
  })

  it('should return empty string when content is null', async () => {
    const OpenAI = require('openai')
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: null } }],
          }),
        },
      },
    }))

    const { generateBookSummary: freshGenerateBookSummary } = require('./openai')
    const result = await freshGenerateBookSummary({
      title: 'Test Book',
      author: 'Test Author',
    })
    expect(result).toBe('')
  })
})

describe('generateGenres', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key' }
    jest.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should parse comma-separated genres', async () => {
    const OpenAI = require('openai')
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Science Fiction, Dystopian, Political' } }],
          }),
        },
      },
    }))

    const { generateGenres: freshGenerateGenres } = require('./openai')
    const result = await freshGenerateGenres({
      title: '1984',
      author: 'George Orwell',
    })
    expect(result).toEqual(['Science Fiction', 'Dystopian', 'Political'])
  })

  it('should filter empty values', async () => {
    const OpenAI = require('openai')
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Fiction, , Mystery, ' } }],
          }),
        },
      },
    }))

    const { generateGenres: freshGenerateGenres } = require('./openai')
    const result = await freshGenerateGenres({
      title: 'Test',
      author: 'Author',
    })
    expect(result).toEqual(['Fiction', 'Mystery'])
  })

  it('should return empty array when content is null', async () => {
    const OpenAI = require('openai')
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: null } }],
          }),
        },
      },
    }))

    const { generateGenres: freshGenerateGenres } = require('./openai')
    const result = await freshGenerateGenres({
      title: 'Test',
      author: 'Author',
    })
    expect(result).toEqual([])
  })
})

describe('generateReviewSummary', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key' }
    jest.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should generate review summary with ratings', async () => {
    const OpenAI = require('openai')
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Readers praise the compelling narrative...' } }],
          }),
        },
      },
    }))

    const { generateReviewSummary: freshGenerateReviewSummary } = require('./openai')
    const result = await freshGenerateReviewSummary('Test Book', [
      { review: 'Great book!', rating: 5 },
      { review: 'Loved it', rating: 4 },
    ])
    expect(result).toBe('Readers praise the compelling narrative...')
  })

  it('should handle reviews without ratings', async () => {
    const OpenAI = require('openai')
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Summary without ratings' } }],
          }),
        },
      },
    }))

    const { generateReviewSummary: freshGenerateReviewSummary } = require('./openai')
    const result = await freshGenerateReviewSummary('Test Book', [
      { review: 'Great book!', rating: null },
    ])
    expect(result).toBe('Summary without ratings')
  })
})

describe('createEmbeddingText', () => {
  it('should combine all book fields', () => {
    const result = createEmbeddingText({
      title: 'Test Book',
      author: 'Test Author',
      description: 'A test description',
      ai_summary: 'AI generated summary',
      genres: ['Fiction', 'Mystery'],
    })
    expect(result).toBe('Test Book. by Test Author. A test description. AI generated summary. Genres: Fiction, Mystery')
  })

  it('should handle missing optional fields', () => {
    const result = createEmbeddingText({
      title: 'Test Book',
      author: 'Test Author',
    })
    expect(result).toBe('Test Book. by Test Author')
  })

  it('should handle empty genres array', () => {
    const result = createEmbeddingText({
      title: 'Test Book',
      author: 'Test Author',
      genres: [],
    })
    expect(result).toBe('Test Book. by Test Author')
  })

  it('should handle null values', () => {
    const result = createEmbeddingText({
      title: 'Test Book',
      author: 'Test Author',
      description: null,
      ai_summary: null,
      genres: null,
    })
    expect(result).toBe('Test Book. by Test Author')
  })
})
