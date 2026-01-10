'use client'

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react'
import type { Book } from '@/types/database'
import type { ChatMessage, StreamChunk } from '@/lib/chat/types'
import type { AppAction } from '@/lib/actions/types'

interface UseChatOptions {
  onAction?: (action: AppAction) => void
  context?: {
    currentBookId?: string
  }
}

interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  isSearching: boolean
  searchQuery: string | null
  error: string | null
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
}

function updateAssistantMessage(
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  messageId: string,
  updates: Partial<ChatMessage>
): void {
  setMessages((prev) =>
    prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
  )
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { onAction, context } = options
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    setError(null)
    setIsLoading(true)
    setIsSearching(false)
    setSearchQuery(null)

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    // Create assistant message placeholder
    const assistantMessageId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: 'assistant', content: '', timestamp: new Date() },
    ])

    try {
      // Prepare messages for API (exclude the empty assistant message)
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, context }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream')
      }

      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let accumulatedBooks: Book[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter((line) => line.trim())

        for (const line of lines) {
          try {
            const chunk: StreamChunk = JSON.parse(line)

            switch (chunk.type) {
              case 'content':
                if (chunk.content) {
                  accumulatedContent += chunk.content
                  updateAssistantMessage(setMessages, assistantMessageId, {
                    content: accumulatedContent,
                  })
                }
                break

              case 'tool_call':
                if (chunk.toolCall?.name === 'search_books') {
                  setIsSearching(true)
                  const query = chunk.toolCall.arguments?.query as string | undefined
                  setSearchQuery(query || 'books')
                }
                break

              case 'tool_result':
                setIsSearching(false)
                setSearchQuery(null)
                if (chunk.toolResult?.books?.length) {
                  accumulatedBooks = [...accumulatedBooks, ...chunk.toolResult.books]
                  updateAssistantMessage(setMessages, assistantMessageId, {
                    books: accumulatedBooks,
                  })
                }
                break

              case 'action':
                // Dispatch the action to the UI
                if (chunk.action && onAction) {
                  onAction(chunk.action)
                }
                break

              case 'error':
                setError(chunk.error || 'An error occurred')
                setIsSearching(false)
                break

              case 'done':
                setIsSearching(false)
                setSearchQuery(null)
                updateAssistantMessage(setMessages, assistantMessageId, {
                  content: accumulatedContent,
                  books: accumulatedBooks.length > 0 ? accumulatedBooks : undefined,
                })
                break
            }
          } catch {
            // Ignore parse errors for partial JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId))
    } finally {
      setIsLoading(false)
      setIsSearching(false)
      setSearchQuery(null)
    }
  }, [messages, onAction, context])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    setIsSearching(false)
    setSearchQuery(null)
  }, [])

  return {
    messages,
    isLoading,
    isSearching,
    searchQuery,
    error,
    sendMessage,
    clearMessages,
  }
}
