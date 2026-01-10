'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message'
import type { ChatMessage as ChatMessageType } from '@/lib/chat/types'

interface ChatMessagesProps {
  messages: ChatMessageType[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

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
          <div className="flex flex-wrap gap-1 justify-center">
            {[
              'Show me mystery books',
              'Any sci-fi available?',
              'Recommend something',
            ].map((suggestion) => (
              <span
                key={suggestion}
                className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground"
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-3 space-y-4"
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  )
}
