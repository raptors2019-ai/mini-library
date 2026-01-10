'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SearchTriggerProps {
  onClick: () => void
  variant?: 'desktop' | 'mobile'
  isActive?: boolean
}

export function SearchTrigger({ onClick, variant = 'desktop', isActive = false }: SearchTriggerProps) {
  if (variant === 'mobile') {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-md transition-colors hover:bg-hover-muted hover:text-hover w-full text-left ${
          isActive ? 'text-primary bg-primary/10' : 'text-foreground/60'
        }`}
      >
        <Search className="h-5 w-5" />
        <span className="text-base">Search</span>
        <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors hover:bg-hover-muted hover:text-hover ${
        isActive ? 'text-primary bg-primary/10' : 'text-foreground/60'
      }`}
    >
      <Search className="h-4 w-4" />
      <span>Search</span>
      <kbd className="ml-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  )
}
