import { classifyQuery, extractGenres, extractStatus } from './classify-query'

describe('classifyQuery', () => {
  describe('simple queries', () => {
    it('classifies single word as simple', () => {
      const result = classifyQuery('mystery')
      expect(result.type).toBe('simple')
      expect(result.directSearchTerm).toBe('mystery')
    })

    it('classifies quoted phrase as simple', () => {
      const result = classifyQuery('"Harry Potter"')
      expect(result.type).toBe('simple')
      expect(result.directSearchTerm).toBe('Harry Potter')
    })

    it('classifies two-word title as simple', () => {
      const result = classifyQuery('Great Gatsby')
      expect(result.type).toBe('simple')
      expect(result.directSearchTerm).toBe('Great Gatsby')
    })

    it('classifies author name as simple', () => {
      const result = classifyQuery('Stephen King')
      expect(result.type).toBe('simple')
    })
  })

  describe('complex queries', () => {
    it('classifies status filter requests as complex', () => {
      const result = classifyQuery('available mystery books')
      expect(result.type).toBe('complex')
      expect(result.detectedIntent?.hasStatusFilter).toBe(true)
    })

    it('classifies similarity requests as complex', () => {
      const result = classifyQuery('books similar to The Alchemist')
      expect(result.type).toBe('complex')
      expect(result.detectedIntent?.hasSimilarityRequest).toBe(true)
    })

    it('classifies qualifier requests as complex', () => {
      const result = classifyQuery('best science fiction books')
      expect(result.type).toBe('complex')
      expect(result.detectedIntent?.hasQualifier).toBe(true)
    })

    it('classifies multi-criteria queries as complex', () => {
      const result = classifyQuery('available fantasy books for young adults')
      expect(result.type).toBe('complex')
    })

    it('classifies natural language queries as complex', () => {
      const result = classifyQuery('show me books about space exploration')
      expect(result.type).toBe('complex')
    })

    it('detects genre filters', () => {
      const result = classifyQuery('mystery thriller books')
      expect(result.detectedIntent?.hasGenreFilter).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles empty query', () => {
      const result = classifyQuery('')
      expect(result.type).toBe('simple')
    })

    it('handles whitespace-only query', () => {
      const result = classifyQuery('   ')
      expect(result.type).toBe('simple')
    })

    it('trims whitespace from queries', () => {
      const result = classifyQuery('  mystery  ')
      expect(result.directSearchTerm).toBe('mystery')
    })
  })
})

describe('extractGenres', () => {
  it('extracts single genre', () => {
    const genres = extractGenres('mystery books')
    expect(genres).toContain('Mystery')
  })

  it('extracts multiple genres', () => {
    const genres = extractGenres('mystery and thriller')
    expect(genres).toContain('Mystery')
    expect(genres).toContain('Thriller')
  })

  it('is case insensitive', () => {
    const genres = extractGenres('SCIENCE FICTION')
    expect(genres).toContain('Science Fiction')
  })

  it('returns empty for no genres', () => {
    const genres = extractGenres('good books')
    expect(genres).toHaveLength(0)
  })
})

describe('extractStatus', () => {
  it('extracts available status', () => {
    expect(extractStatus('available books')).toBe('available')
    expect(extractStatus('books in stock')).toBe('available')
  })

  it('extracts checked_out status', () => {
    expect(extractStatus('checked out books')).toBe('checked_out')
    expect(extractStatus('unavailable books')).toBe('checked_out')
  })

  it('extracts on_hold status', () => {
    expect(extractStatus('books on hold')).toBe('on_hold')
    expect(extractStatus('reserved books')).toBe('on_hold')
  })

  it('returns null for no status', () => {
    expect(extractStatus('mystery books')).toBeNull()
  })
})
