'use client'

import { X, Minimize2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { SearchingIndicator } from './searching-indicator'
import type { ChatMessage } from '@/lib/chat/types'

interface ChatWindowProps {
  messages: ChatMessage[]
  isLoading: boolean
  isSearching: boolean
  searchQuery: string | null
  error: string | null
  onSend: (message: string) => void
  onClear: () => void
  onMinimize: () => void
  onClose: () => void
}

export function ChatWindow({
  messages,
  isLoading,
  isSearching,
  searchQuery,
  error,
  onSend,
  onClear,
  onMinimize,
  onClose,
}: ChatWindowProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] h-[500px] bg-background border rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in-0 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <div>
            <h2 className="font-semibold text-sm">Library Assistant</h2>
            <p className="text-xs text-muted-foreground">Ask about books</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClear}
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMinimize}
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ChatMessages messages={messages} />

      {/* Searching Indicator */}
      {isSearching && (
        <div className="border-t">
          <SearchingIndicator query={searchQuery} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t">
        <ChatInput onSend={onSend} isLoading={isLoading} />
      </div>
    </div>
  )
}
