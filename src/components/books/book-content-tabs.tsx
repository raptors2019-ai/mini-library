'use client'

import { useState, useEffect } from 'react'
import { BookOpen, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookContentTabsProps {
  bookInfo: React.ReactNode
  reviews: React.ReactNode
  reviewCount?: number
}

export function BookContentTabs({
  bookInfo,
  reviews,
  reviewCount = 0,
}: BookContentTabsProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info')

  return (
    <div className="space-y-6">
      {/* Tab Navigation - Hardcover style */}
      <div className="border-b border-border">
        <nav className="flex gap-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              'relative py-3 text-sm font-medium transition-colors',
              'hover:text-foreground',
              activeTab === 'info'
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Book Info
            </span>
            {activeTab === 'info' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={cn(
              'relative py-3 text-sm font-medium transition-colors',
              'hover:text-foreground',
              activeTab === 'reviews'
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Reviews
              {reviewCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-muted text-xs font-semibold">
                  {reviewCount}
                </span>
              )}
            </span>
            {activeTab === 'reviews' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'info' && (
          <div className="animate-in fade-in-0 duration-200">
            {bookInfo}
          </div>
        )}
        {activeTab === 'reviews' && (
          <div className="animate-in fade-in-0 duration-200">
            {reviews}
          </div>
        )}
      </div>
    </div>
  )
}
