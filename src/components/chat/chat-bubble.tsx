'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatBubbleProps {
  onClick: () => void
  hasMessages?: boolean
}

export function ChatBubble({ onClick, hasMessages }: ChatBubbleProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
        'animate-in slide-in-from-bottom-2 fade-in-0 duration-300',
        !hasMessages && 'animate-pulse-subtle'
      )}
      aria-label="Open chat assistant"
    >
      <MessageCircle className="h-6 w-6" />
      {hasMessages && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive" />
      )}
    </Button>
  )
}
