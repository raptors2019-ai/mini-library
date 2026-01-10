/**
 * Action types for the AI-powered copilot system
 * These actions can be dispatched by the command palette or chat widget
 * to manipulate the UI
 */

export interface NavigateAction {
  type: 'navigate'
  payload: {
    path: string
    params?: Record<string, string>
  }
}

export interface ApplyFiltersAction {
  type: 'apply_filters'
  payload: {
    search?: string
    genres?: string[]
    statuses?: string[]
  }
}

export interface OpenBookAction {
  type: 'open_book'
  payload: {
    bookId: string
  }
}

export interface ShowNotificationAction {
  type: 'show_notification'
  payload: {
    title: string
    description?: string
    variant?: 'default' | 'destructive'
  }
}

export interface OpenCommandPaletteAction {
  type: 'open_command_palette'
}

export interface CloseCommandPaletteAction {
  type: 'close_command_palette'
}

export type AppAction =
  | NavigateAction
  | ApplyFiltersAction
  | OpenBookAction
  | ShowNotificationAction
  | OpenCommandPaletteAction
  | CloseCommandPaletteAction

/**
 * Current app context that AI can use to understand where the user is
 */
export interface AppContext {
  currentPath: string
  currentFilters?: {
    search?: string
    genres?: string[]
    statuses?: string[]
  }
}

/**
 * Build URL search params from filter values
 */
export function buildFilterParams(filters: ApplyFiltersAction['payload']): string {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set('search', filters.search)
  }

  if (filters.genres && filters.genres.length > 0) {
    params.set('genres', filters.genres.join(','))
  }

  if (filters.statuses && filters.statuses.length > 0) {
    params.set('statuses', filters.statuses.join(','))
  }

  return params.toString()
}
