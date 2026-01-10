'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface ReviewSummaryProps {
  bookId: string
}

interface SummaryResponse {
  summary: string | null
  generatedAt?: string
  cached?: boolean
  reason?: string
}

export function ReviewSummary({ bookId }: ReviewSummaryProps): React.ReactElement | null {
  const [data, setData] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSummary(): Promise<void> {
      try {
        const response = await fetch(`/api/books/${bookId}/review-summary`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Failed to fetch review summary:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [bookId])

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border border-primary/10 p-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span className="text-sm font-medium text-primary">
                AI is summarizing reader reviews...
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Analyzing feedback to highlight key themes
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Don't render if no summary available
  if (!data?.summary) {
    return null
  }

  return (
    <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border border-primary/10 p-6">
      {/* Decorative elements */}
      <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-accent/10 blur-xl" />

      {/* Large decorative quote */}
      <div className="absolute top-4 right-6 text-6xl font-serif text-primary/5 select-none leading-none">
        &ldquo;
      </div>

      <div className="relative space-y-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
              AI Summary of Reader Reviews
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            · synthesized from community feedback
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {data.summary}
        </p>
      </div>
    </section>
  )
}
