'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

interface SearchingIndicatorProps {
  query: string | null
}

export function SearchingIndicator({ query }: SearchingIndicatorProps) {
  const [displayText, setDisplayText] = useState('')
  const [dotCount, setDotCount] = useState(0)
  const fullText = query ? `Searching for "${query}"` : 'Searching'

  // Typewriter effect for the query
  useEffect(() => {
    setDisplayText('')
    let index = 0

    const typeInterval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayText(fullText.slice(0, index + 1))
        index++
      } else {
        clearInterval(typeInterval)
      }
    }, 30)

    return () => clearInterval(typeInterval)
  }, [fullText])

  // Animated dots
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4)
    }, 400)

    return () => clearInterval(dotInterval)
  }, [])

  const dots = '.'.repeat(dotCount)

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-2">
      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10">
        <Search className="h-3.5 w-3.5 text-primary animate-pulse" />
      </div>
      <span className="font-medium">
        {displayText}
        <span className="inline-block w-6 text-left">{dots}</span>
      </span>
    </div>
  )
}
