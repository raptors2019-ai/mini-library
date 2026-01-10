'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { classifyQuery } from '@/lib/search/classify-query'
import type { ClassifyResponse } from '@/app/api/search/classify/route'

interface UseCommandPaletteReturn {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
  isLoading: boolean
  error: string | null
  handleSearch: () => Promise<void>
  handleKeyDown: (e: React.KeyboardEvent) => void
}

/**
 * Build URL search params for navigation to /books
 */
function buildSearchParams(params: ClassifyResponse['params']): string {
  const searchParams = new URLSearchParams()

  if (params.search) {
    searchParams.set('search', params.search)
  }

  if (params.genres && params.genres.length > 0) {
    searchParams.set('genres', params.genres.join(','))
  }

  if (params.statuses && params.statuses.length > 0) {
    searchParams.set('statuses', params.statuses.join(','))
  }

  return searchParams.toString()
}

export function useCommandPalette(): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Handle global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen])

  // Clear state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  const handleSearch = useCallback(async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    setError(null)
    setIsLoading(true)

    try {
      // First, classify the query locally
      const classification = classifyQuery(trimmedQuery)

      if (classification.type === 'simple') {
        // Simple query - go directly to /books with search param
        const searchParams = buildSearchParams({ search: trimmedQuery })
        router.push(`/books?${searchParams}`)
        setIsOpen(false)
        return
      }

      // Complex query - use AI to extract params
      const response = await fetch('/api/search/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmedQuery }),
      })

      const data: ClassifyResponse = await response.json()

      if (!data.success) {
        // Fallback to simple search on error
        const searchParams = buildSearchParams({ search: trimmedQuery })
        router.push(`/books?${searchParams}`)
        setIsOpen(false)
        return
      }

      // Build URL with extracted params
      const searchParams = buildSearchParams(data.params)

      // If no params extracted, use the original query as search
      if (!searchParams) {
        router.push(`/books?search=${encodeURIComponent(trimmedQuery)}`)
      } else {
        router.push(`/books?${searchParams}`)
      }

      setIsOpen(false)
    } catch (err) {
      console.error('Search error:', err)
      // Fallback to simple search on error
      router.push(`/books?search=${encodeURIComponent(trimmedQuery)}`)
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }, [query, router])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        e.preventDefault()
        handleSearch()
      }
    },
    [handleSearch, isLoading]
  )

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    isLoading,
    error,
    handleSearch,
    handleKeyDown,
  }
}
