'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Search, X, ChevronDown, Sparkles } from 'lucide-react'
import { useCallback, useState, useTransition, useEffect } from 'react'
import { GENRES, BOOK_STATUS_LABELS } from '@/lib/constants'
import { isConversationalQuery } from '@/lib/utils'
import type { BookStatus } from '@/types/database'

const STATUSES: { value: BookStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'on_hold_premium', label: 'On Hold (Premium)' },
  { value: 'on_hold_waitlist', label: 'On Hold (Waitlist)' },
]

export function BookFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [useSemanticSearch, setUseSemanticSearch] = useState(searchParams.get('semantic') === 'true')

  // Sync state with URL params when they change (e.g., from command palette)
  useEffect(() => {
    setSearchInput(searchParams.get('search') || '')
    setUseSemanticSearch(searchParams.get('semantic') === 'true')
  }, [searchParams])

  // Parse multi-value params
  const selectedGenres = searchParams.get('genres')?.split(',').filter(Boolean) || []
  const selectedStatuses = searchParams.get('statuses')?.split(',').filter(Boolean) || []

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      params.delete('page') // Reset to page 1 on filter change
      return params.toString()
    },
    [searchParams]
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(() => {
      // Auto-detect if query is conversational and should use AI search
      const shouldUseSemantic = useSemanticSearch || isConversationalQuery(searchInput)

      if (shouldUseSemantic) {
        // Auto-enable the toggle if we detected conversational query
        if (!useSemanticSearch && isConversationalQuery(searchInput)) {
          setUseSemanticSearch(true)
        }
        // Add semantic param to enable AI search on books page
        router.push(`/books?${createQueryString({ search: searchInput, semantic: 'true' })}`)
      } else {
        router.push(`/books?${createQueryString({ search: searchInput, semantic: null })}`)
      }
    })
  }

  const handleGenreToggle = (genre: string) => {
    const newGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre]

    startTransition(() => {
      router.push(`/books?${createQueryString({
        genres: newGenres.length > 0 ? newGenres.join(',') : null
      })}`)
    })
  }

  const handleStatusToggle = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status]

    startTransition(() => {
      router.push(`/books?${createQueryString({
        statuses: newStatuses.length > 0 ? newStatuses.join(',') : null
      })}`)
    })
  }

  const removeGenre = (genre: string) => {
    const newGenres = selectedGenres.filter(g => g !== genre)
    startTransition(() => {
      router.push(`/books?${createQueryString({
        genres: newGenres.length > 0 ? newGenres.join(',') : null
      })}`)
    })
  }

  const removeStatus = (status: string) => {
    const newStatuses = selectedStatuses.filter(s => s !== status)
    startTransition(() => {
      router.push(`/books?${createQueryString({
        statuses: newStatuses.length > 0 ? newStatuses.join(',') : null
      })}`)
    })
  }

  const clearFilters = () => {
    setSearchInput('')
    startTransition(() => {
      router.push('/books')
    })
  }

  const hasFilters = searchParams.has('search') || selectedGenres.length > 0 || selectedStatuses.length > 0
  const hasActiveFilterTags = selectedGenres.length > 0 || selectedStatuses.length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Filter controls row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={useSemanticSearch ? "Try 'books about habit formation'..." : "Search books..."}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={isPending}>
              Search
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="semantic-search-books"
              checked={useSemanticSearch}
              onCheckedChange={setUseSemanticSearch}
            />
            <Label htmlFor="semantic-search-books" className="flex items-center gap-2 cursor-pointer text-sm">
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

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Status multi-select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none sm:w-[160px] justify-between">
                {selectedStatuses.length === 0
                  ? 'Status'
                  : selectedStatuses.length === 1
                  ? BOOK_STATUS_LABELS[selectedStatuses[0] as BookStatus] || selectedStatuses[0]
                  : `${selectedStatuses.length} statuses`}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2" align="start">
              <div className="flex flex-col gap-1">
                {STATUSES.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-sm hover:bg-primary/10 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedStatuses.includes(status.value)}
                      onCheckedChange={() => handleStatusToggle(status.value)}
                    />
                    <span className="text-sm">{status.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Genre multi-select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none sm:w-[160px] justify-between">
                {selectedGenres.length === 0
                  ? 'Genres'
                  : selectedGenres.length === 1
                  ? selectedGenres[0]
                  : `${selectedGenres.length} genres`}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2 max-h-[300px] overflow-y-auto" align="start">
              <div className="flex flex-col gap-1">
                {GENRES.map((genre) => (
                  <label
                    key={genre}
                    className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-sm hover:bg-primary/10 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedGenres.includes(genre)}
                      onCheckedChange={() => handleGenreToggle(genre)}
                    />
                    <span className="text-sm">{genre}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active filter tags */}
      {hasActiveFilterTags && (
        <div className="flex flex-wrap gap-2">
          {selectedStatuses.map((status) => (
            <Badge
              key={status}
              className="gap-1 pr-0.5 bg-primary/15 text-primary border-primary/25 hover:bg-primary/20"
            >
              {BOOK_STATUS_LABELS[status as BookStatus] || status}
              <button
                onClick={() => removeStatus(status)}
                className="ml-1 rounded-full p-1.5 min-w-[24px] min-h-[24px] flex items-center justify-center hover:bg-primary/30"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedGenres.map((genre) => (
            <Badge
              key={genre}
              className="gap-1 pr-0.5 bg-primary/15 text-primary border-primary/25 hover:bg-primary/20"
            >
              {genre}
              <button
                onClick={() => removeGenre(genre)}
                className="ml-1 rounded-full p-1.5 min-w-[24px] min-h-[24px] flex items-center justify-center hover:bg-primary/30"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
