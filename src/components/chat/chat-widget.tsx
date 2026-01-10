'use client'

import { useState } from 'react'
import { ChatBubble } from './chat-bubble'
import { ChatWindow } from './chat-window'
import { useChat } from '@/hooks/use-chat'

export function ChatWidget(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false)
  const [hasBeenOpened, setHasBeenOpened] = useState(false)
  const { messages, isLoading, isSearching, searchQuery, error, sendMessage, clearMessages } = useChat()

  function handleOpen(): void {
    setIsOpen(true)
    setHasBeenOpened(true)
  }

  function handleClose(): void {
    setIsOpen(false)
  }

  if (isOpen) {
    return (
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        isSearching={isSearching}
        searchQuery={searchQuery}
        error={error}
        onSend={sendMessage}
        onClear={clearMessages}
        onMinimize={handleClose}
        onClose={handleClose}
      />
    )
  }

  return (
    <ChatBubble
      onClick={handleOpen}
      hasMessages={hasBeenOpened && messages.length > 0}
    />
  )
}
