'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Search, X, ChevronDown } from 'lucide-react'
import { useCallback, useState, useTransition, useEffect } from 'react'
import { GENRES, BOOK_STATUS_LABELS } from '@/lib/constants'
import type { BookStatus } from '@/types/database'

const STATUSES: { value: BookStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'on_hold', label: 'On Hold' },
]

export function BookFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')

  // Sync searchInput with URL params when they change (e.g., from command palette)
  useEffect(() => {
    setSearchInput(searchParams.get('search') || '')
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
      router.push(`/books?${createQueryString({ search: searchInput })}`)
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
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            Search
          </Button>
        </form>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Status multi-select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none sm:w-[140px] justify-between">
                {selectedStatuses.length > 0
                  ? `${selectedStatuses.length} selected`
                  : 'Status'}
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
              <Button variant="outline" className="flex-1 sm:flex-none sm:w-[140px] justify-between">
                {selectedGenres.length > 0
                  ? `${selectedGenres.length} selected`
                  : 'Genres'}
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
