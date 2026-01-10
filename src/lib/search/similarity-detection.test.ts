import { detectSimilarityQuery, cleanSimilarityQuery } from './similarity-detection'

describe('detectSimilarityQuery', () => {
  describe('should detect similarity queries', () => {
    const similarityQueries = [
      // Basic patterns
      { query: 'books similar to Harry Potter', expectedTitle: 'Harry Potter' },
      { query: 'similar to The Hobbit', expectedTitle: 'The Hobbit' },
      { query: 'books like Atomic Habits', expectedTitle: 'Atomic Habits' },
      { query: 'like 1984', expectedTitle: '1984' },

      // With quotes
      { query: 'books similar to "The Great Gatsby"', expectedTitle: 'The Great Gatsby' },
      { query: "similar to 'Pride and Prejudice'", expectedTitle: 'Pride and Prejudice' },

      // "If I liked" patterns
      { query: 'if I liked Dune', expectedTitle: 'Dune' },
      { query: 'if you liked The Martian', expectedTitle: 'The Martian' },
      { query: 'if I loved Project Hail Mary', expectedTitle: 'Project Hail Mary' },

      // "More like" patterns
      { query: 'more like Ready Player One', expectedTitle: 'Ready Player One' },
      { query: 'more books like Enders Game', expectedTitle: 'Enders Game' },

      // Recommendation patterns
      { query: 'recommendations based on Sapiens', expectedTitle: 'Sapiens' },
      { query: 'recommendations for The Alchemist', expectedTitle: 'The Alchemist' },

      // Something like patterns
      { query: 'something like Gone Girl', expectedTitle: 'Gone Girl' },

      // Find me patterns
      { query: 'find me something like The Da Vinci Code', expectedTitle: 'The Da Vinci Code' },
      { query: 'find books like To Kill a Mockingbird', expectedTitle: 'To Kill a Mockingbird' },

      // What's similar patterns
      { query: "what's similar to Lord of the Rings", expectedTitle: 'Lord of the Rings' },
      { query: 'what is similar to A Game of Thrones', expectedTitle: 'A Game of Thrones' },

      // Suggest/recommend patterns
      { query: 'suggest books like The Catcher in the Rye', expectedTitle: 'The Catcher in the Rye' },
      { query: 'recommend something similar to Brave New World', expectedTitle: 'Brave New World' },

      // Inverted patterns
      { query: 'Harry Potter similar books', expectedTitle: 'Harry Potter' },

      // Various word forms
      { query: 'novels similar to Jane Eyre', expectedTitle: 'Jane Eyre' },
      { query: 'stories like The Little Prince', expectedTitle: 'The Little Prince' },
      { query: 'reads similar to Where the Crawdads Sing', expectedTitle: 'Where the Crawdads Sing' },
    ]

    test.each(similarityQueries)(
      'should detect "$query" as similarity query for "$expectedTitle"',
      ({ query, expectedTitle }) => {
        const result = detectSimilarityQuery(query)
        expect(result.isSimilarityQuery).toBe(true)
        expect(result.sourceBookTitle).toBe(expectedTitle)
      }
    )
  })

  describe('should NOT detect non-similarity queries', () => {
    const nonSimilarityQueries = [
      'mystery books',
      'Harry Potter',
      'books by Stephen King',
      'fantasy adventure',
      'best science fiction novels',
      'new releases',
      'trending books',
      'self-improvement',
      'biography of Elon Musk',
      'programming books',
      'like', // Too short
      'similar', // Too short
      'books about habits',
    ]

    test.each(nonSimilarityQueries)(
      'should NOT detect "%s" as similarity query',
      (query) => {
        const result = detectSimilarityQuery(query)
        expect(result.isSimilarityQuery).toBe(false)
        expect(result.sourceBookTitle).toBeUndefined()
      }
    )
  })

  describe('edge cases', () => {
    it('should handle extra whitespace', () => {
      const result = detectSimilarityQuery('  books similar to   Harry Potter  ')
      expect(result.isSimilarityQuery).toBe(true)
      expect(result.sourceBookTitle).toBe('Harry Potter')
    })

    it('should handle mixed case', () => {
      const result = detectSimilarityQuery('BOOKS SIMILAR TO the hobbit')
      expect(result.isSimilarityQuery).toBe(true)
      expect(result.sourceBookTitle).toBe('the hobbit')
    })

    it('should handle empty string', () => {
      const result = detectSimilarityQuery('')
      expect(result.isSimilarityQuery).toBe(false)
    })

    it('should reject very short book titles', () => {
      const result = detectSimilarityQuery('books like X')
      expect(result.isSimilarityQuery).toBe(false)
    })
  })
})

describe('cleanSimilarityQuery', () => {
  const cleaningCases = [
    { input: 'books similar to Harry Potter', expected: 'Harry Potter' },
    { input: 'similar to The Hobbit', expected: 'The Hobbit' },
    { input: 'books like Atomic Habits', expected: 'Atomic Habits' },
    { input: 'if I liked Dune', expected: 'Dune' },
    { input: 'more like Ready Player One', expected: 'Ready Player One' },
    { input: '"The Great Gatsby"', expected: 'The Great Gatsby' },
  ]

  test.each(cleaningCases)(
    'should clean "$input" to "$expected"',
    ({ input, expected }) => {
      expect(cleanSimilarityQuery(input)).toBe(expected)
    }
  )
})
