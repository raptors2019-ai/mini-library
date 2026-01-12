'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatBubbleProps {
  onClick: () => void
}

export function ChatBubble({ onClick }: ChatBubbleProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
        'animate-in slide-in-from-bottom-2 fade-in-0 duration-300',
        'mb-[env(safe-area-inset-bottom)] mr-[env(safe-area-inset-right)]'
      )}
      aria-label="Open chat assistant"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  )
}
