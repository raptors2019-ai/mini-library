'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Sparkles, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { BookGrid } from '@/components/books/book-grid'
import type { Book } from '@/types/database'
import { Badge } from '@/components/ui/badge'

const SEARCH_TYPE_LABELS: Record<string, string> = {
  semantic: 'AI Search',
  hybrid: 'AI + Text Search',
  text_fallback: 'Text Search (fallback)',
  text: 'Text Search',
  similar: 'Similar Books (AI)',
  similar_genre: 'Similar Books (Genre)',
}

const EXAMPLE_QUERIES = [
  'classic detective mystery novels',
  'adventure stories for young readers',
  'inspiring biographies of famous people',
  'science fiction and fantasy worlds',
]

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [useSemanticSearch, setUseSemanticSearch] = useState(true)
  const [searchType, setSearchType] = useState<string>('')

  const performSearch = useCallback(async (searchQuery: string, semantic: boolean = true) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      if (semantic) {
        // Use semantic search
        const response = await fetch('/api/search/semantic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery.trim(), limit: 20 })
        })
        const data = await response.json()
        setBooks(data.books || [])
        setSearchType(data.search_type || 'semantic')
      } else {
        // Use text search
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery.trim())}&limit=20`)
        const data = await response.json()
        setBooks(data.books || [])
        setSearchType('text')
      }
    } catch (error) {
      console.error('Search error:', error)
      setBooks([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Sync query state and auto-search when URL query param changes (e.g., from chat)
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery) // Update the input field to show the new query
      performSearch(initialQuery, true)
    }
  }, [initialQuery, performSearch])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query, useSemanticSearch)
  }

  const handleExampleClick = (example: string) => {
    setQuery(example)
    setUseSemanticSearch(true)
    performSearch(example, true)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Search className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Search Books</h1>
        </div>
        <p className="text-muted-foreground">
          Find books using natural language. Try searching for topics, themes, or specific interests.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={useSemanticSearch
                ? "Try 'books about habit formation' or 'dystopian fiction'"
                : "Search by title, author, or description"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="semantic-search"
            checked={useSemanticSearch}
            onCheckedChange={setUseSemanticSearch}
          />
          <Label htmlFor="semantic-search" className="flex items-center gap-2 cursor-pointer">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-Powered Search
          </Label>
          {useSemanticSearch && (
            <span className="text-xs text-muted-foreground">
              Uses semantic understanding to find relevant books
            </span>
          )}
        </div>
      </form>

      {!searched && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Try these example searches:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleExampleClick(example)}
              >
                {example}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {searched && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {books.length} {books.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
            </p>
            {searchType && (
              <Badge variant="outline" className="text-xs">
                {SEARCH_TYPE_LABELS[searchType] || searchType}
              </Badge>
            )}
          </div>
          <BookGrid books={books} loading={loading} />
        </div>
      )}
    </div>
  )
}
