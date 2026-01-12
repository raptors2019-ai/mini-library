import { GENRES } from '@/lib/constants'

export interface ClassificationResult {
  type: 'simple' | 'complex'
  confidence: number
  directSearchTerm?: string
  detectedIntent?: {
    hasStatusFilter: boolean
    hasGenreFilter: boolean
    hasSimilarityRequest: boolean
    hasQualifier: boolean
  }
}

// Keywords that indicate a status filter request
const STATUS_KEYWORDS = [
  'available',
  'checked out',
  'checked-out',
  'on hold',
  'on-hold',
  'can borrow',
  'can checkout',
  'in stock',
  'not available',
  'unavailable',
]

// Keywords that indicate a qualifier/preference
const QUALIFIER_KEYWORDS = [
  'good',
  'best',
  'great',
  'popular',
  'top',
  'recommended',
  'trending',
  'new',
  'recent',
  'classic',
  'famous',
  'highly rated',
  'well-reviewed',
]

// Keywords that indicate similarity search
const SIMILARITY_KEYWORDS = [
  'similar to',
  'like',
  'books like',
  'something like',
  'reminds me of',
  'in the style of',
  'comparable to',
  'same as',
  'related to',
]

// Natural language patterns that suggest complex queries
const COMPLEX_PATTERNS = [
  /^(show|find|get|search|look for|i want|i need|give me|recommend)/i,
  /books?\s+(about|on|for|by)/i,
  /something\s+(about|like|for)/i,
  /\b(and|with|from|published|written)\b/i,
]

/**
 * Classify a search query as simple or complex
 * Simple queries can go directly to /books?search=X
 * Complex queries need AI interpretation to extract filters
 */
export function classifyQuery(query: string): ClassificationResult {
  const normalizedQuery = query.trim().toLowerCase()

  // Empty or very short queries are simple
  if (normalizedQuery.length < 2) {
    return {
      type: 'simple',
      confidence: 1.0,
      directSearchTerm: query.trim(),
    }
  }

  // Detect various intents
  const hasStatusFilter = STATUS_KEYWORDS.some(keyword =>
    normalizedQuery.includes(keyword)
  )

  const hasGenreFilter = GENRES.some(genre =>
    normalizedQuery.includes(genre.toLowerCase())
  )

  const hasSimilarityRequest = SIMILARITY_KEYWORDS.some(keyword =>
    normalizedQuery.includes(keyword)
  )

  const hasQualifier = QUALIFIER_KEYWORDS.some(keyword =>
    normalizedQuery.includes(keyword)
  )

  const hasComplexPattern = COMPLEX_PATTERNS.some(pattern =>
    pattern.test(normalizedQuery)
  )

  // Calculate complexity score
  let complexityScore = 0
  if (hasStatusFilter) complexityScore += 2
  if (hasGenreFilter) complexityScore += 1
  if (hasSimilarityRequest) complexityScore += 3
  if (hasQualifier) complexityScore += 1
  if (hasComplexPattern) complexityScore += 1

  // Word count heuristic - longer queries tend to be more complex
  const wordCount = normalizedQuery.split(/\s+/).length
  if (wordCount > 4) complexityScore += 1
  if (wordCount > 7) complexityScore += 1

  // Quoted phrases are considered simple (exact search)
  const isQuotedPhrase = /^["'].*["']$/.test(query.trim())
  if (isQuotedPhrase) {
    return {
      type: 'simple',
      confidence: 0.95,
      directSearchTerm: query.trim().replace(/^["']|["']$/g, ''),
    }
  }

  // Single word queries are simple
  if (wordCount === 1 && complexityScore === 0) {
    return {
      type: 'simple',
      confidence: 0.9,
      directSearchTerm: query.trim(),
    }
  }

  // Two words without special indicators could be a title or author
  if (wordCount === 2 && complexityScore === 0) {
    return {
      type: 'simple',
      confidence: 0.7,
      directSearchTerm: query.trim(),
    }
  }

  // Determine final classification
  const isComplex = complexityScore >= 2

  return {
    type: isComplex ? 'complex' : 'simple',
    confidence: isComplex
      ? Math.min(0.95, 0.5 + complexityScore * 0.1)
      : Math.max(0.5, 0.9 - complexityScore * 0.1),
    directSearchTerm: isComplex ? undefined : query.trim(),
    detectedIntent: {
      hasStatusFilter,
      hasGenreFilter,
      hasSimilarityRequest,
      hasQualifier,
    },
  }
}

/**
 * Extract detected genres from a query (for quick suggestions)
 */
export function extractGenres(query: string): string[] {
  const normalizedQuery = query.toLowerCase()
  return GENRES.filter(genre =>
    normalizedQuery.includes(genre.toLowerCase())
  )
}

/**
 * Extract detected status from a query
 */
export function extractStatus(query: string): string | null {
  const normalizedQuery = query.toLowerCase()

  // Check for "unavailable" first (before "available" which is a substring)
  if (normalizedQuery.includes('unavailable') ||
      normalizedQuery.includes('checked out') ||
      normalizedQuery.includes('checked-out')) {
    return 'checked_out'
  }

  if (normalizedQuery.includes('on hold') ||
      normalizedQuery.includes('on-hold') ||
      normalizedQuery.includes('reserved')) {
    // Return on_hold_premium - API will expand to include both hold statuses
    return 'on_hold_premium'
  }

  // Check for "available" last since it's a substring of "unavailable"
  if (normalizedQuery.includes('available') ||
      normalizedQuery.includes('in stock') ||
      normalizedQuery.includes('can borrow')) {
    return 'available'
  }

  return null
}
