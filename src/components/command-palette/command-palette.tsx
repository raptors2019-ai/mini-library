'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Sparkles, BookOpen, TrendingUp } from 'lucide-react'
import {
  CommandDialog,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { classifyQuery } from '@/lib/search/classify-query'
import type { ClassifyResponse } from '@/app/api/search/classify/route'
import { GENRES } from '@/lib/constants'
import { useRouter } from 'next/navigation'

// Quick genre suggestions (kept compact)
const QUICK_GENRES = ['Mystery', 'Science Fiction', 'Fantasy']

// Example queries to show users what's possible
const EXAMPLE_QUERIES = [
  'available mystery books',
  'books similar to The Alchemist',
  'best science fiction',
  'fantasy books for young adults',
]

function buildSearchParams(params: ClassifyResponse['params']): string {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.genres && params.genres.length > 0) searchParams.set('genres', params.genres.join(','))
  if (params.statuses && params.statuses.length > 0) searchParams.set('statuses', params.statuses.join(','))
  return searchParams.toString()
}

interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandPalette({ open: externalOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Use external state if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  // Handle global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [setIsOpen])

  // Clear state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setIsLoading(false)
    }
  }, [isOpen])

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const trimmedQuery = (overrideQuery ?? query).trim()
    if (!trimmedQuery) return

    setIsLoading(true)

    try {
      const classification = classifyQuery(trimmedQuery)

      // For simple searches (just a title/author), use semantic search page
      if (classification.type === 'simple') {
        router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
        setIsOpen(false)
        return
      }

      // For complex queries with filters, try to classify and route appropriately
      const response = await fetch('/api/search/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmedQuery }),
      })

      const data: ClassifyResponse = await response.json()

      if (!data.success) {
        // Fallback to semantic search page for natural language queries
        router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
        setIsOpen(false)
        return
      }

      // If we have genre/status filters, use books page with filters
      // Otherwise use semantic search for better natural language understanding
      const hasFilters = (data.params.genres && data.params.genres.length > 0) ||
                        (data.params.statuses && data.params.statuses.length > 0)

      if (hasFilters) {
        const searchParams = buildSearchParams(data.params)
        router.push(`/books?${searchParams}`)
      } else {
        // Use semantic search page for natural language queries
        router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
      }
      setIsOpen(false)
    } catch {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }, [query, router, setIsOpen])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleGenreClick = (genre: string) => {
    router.push(`/books?genres=${encodeURIComponent(genre)}`)
    setIsOpen(false)
  }

  const handleExampleClick = (example: string) => {
    setQuery(example)
    // Pass the example directly to avoid stale state from async update
    handleSearch(example)
  }

  const handleAvailableBooks = () => {
    router.push('/books?statuses=available')
    setIsOpen(false)
  }

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      title="Search Library"
      description="Search for books, authors, or try natural language queries"
    >
      <div className="flex items-center border-b px-3">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading && query.trim()) {
              e.preventDefault()
              handleSearch()
            }
          }}
          placeholder="Search books, authors, or ask naturally..."
          className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        />
      </div>

      <CommandList className="max-h-[400px]">
        {query.trim() === '' ? (
          <>
            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={handleAvailableBooks}>
                <BookOpen className="mr-2 h-4 w-4 text-green-500" />
                <span>Browse available books</span>
              </CommandItem>
              <CommandItem onSelect={() => {
                router.push('/books')
                setIsOpen(false)
              }}>
                <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                <span>View all books</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Popular Genres */}
            <CommandGroup heading="Popular Genres">
              {QUICK_GENRES.map((genre) => (
                <CommandItem
                  key={genre}
                  onSelect={() => handleGenreClick(genre)}
                >
                  <span className="mr-2 h-4 w-4 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    #
                  </span>
                  <span>{genre}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Example Queries */}
            <CommandGroup heading="Try asking...">
              {EXAMPLE_QUERIES.map((example) => (
                <CommandItem
                  key={example}
                  onSelect={() => handleExampleClick(example)}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-primary/60" />
                  <span className="text-muted-foreground">{example}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : (
          <>
            {/* Search Results Hint */}
            <CommandGroup heading="Search">
              <CommandItem onSelect={handleSearch} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                )}
                <span>
                  {isLoading ? 'Searching...' : `Search for "${query}"`}
                </span>
              </CommandItem>
            </CommandGroup>

            {/* Quick genre matches if query matches a genre */}
            {GENRES.some(g => g.toLowerCase().includes(query.toLowerCase())) && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Matching Genres">
                  {GENRES.filter(g =>
                    g.toLowerCase().includes(query.toLowerCase())
                  ).slice(0, 4).map((genre) => (
                    <CommandItem
                      key={genre}
                      onSelect={() => handleGenreClick(genre)}
                    >
                      <span className="mr-2 h-4 w-4 flex items-center justify-center text-xs font-medium text-muted-foreground">
                        #
                      </span>
                      <span>{genre}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}

        <CommandEmpty>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                AI is processing your query...
              </span>
            </div>
          ) : (
            <div className="py-6 text-center text-sm">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd> to search
            </div>
          )}
        </CommandEmpty>
      </CommandList>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>AI-powered search understands natural language</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Esc</kbd>
          <span>to close</span>
        </div>
      </div>
    </CommandDialog>
  )
}
