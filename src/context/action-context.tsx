'use client'

import { createContext, useContext } from 'react'
import type { AppAction, AppContext } from '@/lib/actions/types'

export interface ActionContextValue {
  // Current app state for AI context
  context: AppContext

  // Action dispatcher
  dispatch: (action: AppAction) => void

  // Command palette state
  isCommandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
}

export const ActionContext = createContext<ActionContextValue | null>(null)

export function useActions(): ActionContextValue {
  const context = useContext(ActionContext)
  if (!context) {
    throw new Error('useActions must be used within an ActionProvider')
  }
  return context
}

/**
 * Hook to get just the dispatch function (for components that only need to dispatch)
 */
export function useDispatch(): (action: AppAction) => void {
  const { dispatch } = useActions()
  return dispatch
}

/**
 * Hook to get the current app context (for AI to understand where user is)
 */
export function useAppContext(): AppContext {
  const { context } = useActions()
  return context
}
