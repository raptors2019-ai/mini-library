'use client'

import { useEffect, useState } from 'react'
import { BookGrid } from './book-grid'
import { Badge } from '@/components/ui/badge'
import type { Book } from '@/types/database'

interface SemanticSearchResultsProps {
  query: string
}

export function SemanticSearchResults({ query }: SemanticSearchResultsProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchType, setSearchType] = useState<string>('')

  useEffect(() => {
    async function fetchResults() {
      if (!query.trim()) {
        setBooks([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const response = await fetch('/api/search/semantic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim(), limit: 20 })
        })
        const data = await response.json()
        setBooks(data.books || [])
        setSearchType(data.search_type || 'semantic')
      } catch (error) {
        console.error('Semantic search error:', error)
        setBooks([])
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query])

  const SEARCH_TYPE_LABELS: Record<string, string> = {
    semantic: 'AI Search',
    hybrid: 'AI + Text Search',
    text_fallback: 'Text Search (fallback)',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Searching...' : `${books.length} results for "${query}"`}
        </p>
        {searchType && !loading && (
          <Badge variant="outline" className="text-xs">
            {SEARCH_TYPE_LABELS[searchType] || searchType}
          </Badge>
        )}
      </div>
      <BookGrid books={books} loading={loading} />
    </div>
  )
}
