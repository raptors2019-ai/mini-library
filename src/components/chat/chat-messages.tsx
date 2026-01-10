'use client'

import { useEffect, useRef, useCallback } from 'react'
import { ChatMessage } from './chat-message'
import type { ChatMessage as ChatMessageType } from '@/lib/chat/types'

interface ChatMessagesProps {
  messages: ChatMessageType[]
  onSuggestionClick?: (suggestion: string) => void
  currentBookTitle?: string
}

export function ChatMessages({ messages, onSuggestionClick, currentBookTitle }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  // Track if user is near bottom to determine if we should auto-scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    // Consider "near bottom" if within 100px of bottom
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100
  }, [])

  // Track the last message's content length to detect streaming updates
  const lastMessage = messages[messages.length - 1]
  const lastMessageContentLength = lastMessage?.content?.length ?? 0
  const lastMessageBooksLength = lastMessage?.books?.length ?? 0

  // Auto-scroll to bottom on new messages AND during content streaming
  // Only if user is near the bottom (not scrolled up to read)
  useEffect(() => {
    if (containerRef.current && shouldAutoScrollRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages.length, lastMessageContentLength, lastMessageBooksLength])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="text-4xl mb-3">📚</div>
        <h3 className="font-medium text-sm">Library Assistant</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          Ask me about books, get recommendations, or check availability
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">Try asking:</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {(currentBookTitle
              ? [
                  'Tell me about this book',
                  'Find similar books',
                  'Is this book available?',
                ]
              : [
                  'What mystery books do you have?',
                  'Show me your top-rated books',
                  'Recommend a book for me',
                ]
            ).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-3 space-y-4"
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  )
}
