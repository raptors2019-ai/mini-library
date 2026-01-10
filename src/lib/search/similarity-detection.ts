/**
 * Utility to detect "similar to X" queries and extract the source book title.
 * Used by both the chatbot and search bar to provide proper similarity search
 * that excludes the source book from results.
 */

export interface SimilarityQueryResult {
  isSimilarityQuery: boolean
  sourceBookTitle?: string
}

/**
 * Detects if a search query is asking for books similar to a specific book.
 *
 * Matches patterns like:
 * - "books similar to Harry Potter"
 * - "similar to The Hobbit"
 * - "books like Atomic Habits"
 * - "like 1984"
 * - "if I liked Dune"
 * - "more like The Great Gatsby"
 * - "recommendations based on Project Hail Mary"
 * - "something like Pride and Prejudice"
 *
 * @param query - The search query to analyze
 * @returns Object with isSimilarityQuery flag and extracted sourceBookTitle
 */
export function detectSimilarityQuery(query: string): SimilarityQueryResult {
  const trimmedQuery = query.trim()

  // Patterns to match "similar to X" style queries
  // Order matters - more specific patterns first
  const patterns = [
    // "books similar to X" or "novels similar to X"
    /^(?:books?|novels?|stories?|reads?)\s+similar\s+to\s+["']?(.+?)["']?$/i,
    // "similar to X" (standalone)
    /^similar\s+to\s+["']?(.+?)["']?$/i,
    // "books like X" or "something like X"
    /^(?:books?|novels?|stories?|reads?|something)\s+like\s+["']?(.+?)["']?$/i,
    // "like X" (standalone, but be careful - only match if it looks like a book query)
    // Allow titles starting with capital letter or number (for titles like "1984")
    /^like\s+["']?([A-Z0-9].+?)["']?$/i,
    // "if I liked X" or "if you liked X" or "if I loved X"
    /^if\s+(?:i|you|we)\s+(?:liked?|loved?|enjoyed?)\s+["']?(.+?)["']?$/i,
    // "more like X" or "more books like X"
    /^more\s+(?:books?\s+)?like\s+["']?(.+?)["']?$/i,
    // "recommendations based on X" or "recommendations for X"
    /^recommendations?\s+(?:based\s+on|for|like)\s+["']?(.+?)["']?$/i,
    // "X similar books" (inverted pattern)
    /^["']?(.+?)["']?\s+similar\s+(?:books?|novels?|reads?)$/i,
    // "find me something like X"
    /^find\s+(?:me\s+)?(?:something|books?)\s+like\s+["']?(.+?)["']?$/i,
    // "what's similar to X" or "what is similar to X"
    /^what(?:'s|\s+is)\s+similar\s+to\s+["']?(.+?)["']?$/i,
    // "suggest books like X" or "recommend books like X"
    /^(?:suggest|recommend)\s+(?:me\s+)?(?:books?|something)\s+(?:like|similar\s+to)\s+["']?(.+?)["']?$/i,
  ]

  for (const pattern of patterns) {
    const match = trimmedQuery.match(pattern)
    if (match && match[1]) {
      const sourceTitle = match[1].trim()
      // Validate that we got something reasonable (not empty, not too short)
      if (sourceTitle.length >= 2) {
        return {
          isSimilarityQuery: true,
          sourceBookTitle: sourceTitle,
        }
      }
    }
  }

  return { isSimilarityQuery: false }
}

/**
 * Removes similarity-related words from a query to get the core book title.
 * Useful for fallback text search when the book isn't found.
 *
 * @param query - The original query
 * @returns Cleaned query with similarity words removed
 */
export function cleanSimilarityQuery(query: string): string {
  return query
    .replace(/^(?:books?|novels?|stories?|reads?|something)\s+(?:similar\s+to|like)\s+/i, '')
    .replace(/^similar\s+to\s+/i, '')
    .replace(/^like\s+/i, '')
    .replace(/^if\s+(?:i|you|we)\s+(?:liked?|loved?|enjoyed?)\s+/i, '')
    .replace(/^more\s+(?:books?\s+)?like\s+/i, '')
    .replace(/^recommendations?\s+(?:based\s+on|for|like)\s+/i, '')
    .replace(/\s+similar\s+(?:books?|novels?|reads?)$/i, '')
    .replace(/^find\s+(?:me\s+)?(?:something|books?)\s+like\s+/i, '')
    .replace(/^what(?:'s|\s+is)\s+similar\s+to\s+/i, '')
    .replace(/^(?:suggest|recommend)\s+(?:me\s+)?(?:books?|something)\s+(?:like|similar\s+to)\s+/i, '')
    .replace(/^["']|["']$/g, '')
    .trim()
}
