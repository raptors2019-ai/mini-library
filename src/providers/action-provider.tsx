'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ActionContext, type ActionContextValue } from '@/context/action-context'
import { buildFilterParams, type AppAction, type AppContext } from '@/lib/actions/types'

interface ActionProviderProps {
  children: React.ReactNode
}

export function ActionProvider({ children }: ActionProviderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Build current context from URL state
  const context = useMemo<AppContext>(() => {
    const currentFilters: AppContext['currentFilters'] = {}

    const search = searchParams.get('search')
    if (search) currentFilters.search = search

    const genres = searchParams.get('genres')
    if (genres) currentFilters.genres = genres.split(',')

    const statuses = searchParams.get('statuses')
    if (statuses) currentFilters.statuses = statuses.split(',')

    return {
      currentPath: pathname,
      currentFilters: Object.keys(currentFilters).length > 0 ? currentFilters : undefined,
    }
  }, [pathname, searchParams])

  // Action dispatcher
  const dispatch = useCallback((action: AppAction) => {
    switch (action.type) {
      case 'navigate': {
        const { path, params } = action.payload
        if (params && Object.keys(params).length > 0) {
          const searchParams = new URLSearchParams(params)
          router.push(`${path}?${searchParams.toString()}`)
        } else {
          router.push(path)
        }
        break
      }

      case 'apply_filters': {
        const params = buildFilterParams(action.payload)
        if (params) {
          router.push(`/books?${params}`)
        } else {
          router.push('/books')
        }
        break
      }

      case 'open_book': {
        router.push(`/books/${action.payload.bookId}`)
        break
      }

      case 'show_notification': {
        const { title, description, variant } = action.payload
        if (variant === 'destructive') {
          toast.error(title, { description })
        } else {
          toast.success(title, { description })
        }
        break
      }

      case 'open_command_palette': {
        setCommandPaletteOpen(true)
        break
      }

      case 'close_command_palette': {
        setCommandPaletteOpen(false)
        break
      }
    }
  }, [router])

  // Handle global keyboard shortcut for command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const value = useMemo<ActionContextValue>(
    () => ({
      context,
      dispatch,
      isCommandPaletteOpen,
      setCommandPaletteOpen,
    }),
    [context, dispatch, isCommandPaletteOpen]
  )

  return (
    <ActionContext.Provider value={value}>
      {children}
    </ActionContext.Provider>
  )
}
