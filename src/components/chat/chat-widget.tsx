'use client'

import { useState, useCallback } from 'react'
import { ChatBubble } from './chat-bubble'
import { ChatWindow } from './chat-window'
import { useChat } from '@/hooks/use-chat'
import { useActions } from '@/context/action-context'

export function ChatWidget(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false)
  const [hasBeenOpened, setHasBeenOpened] = useState(false)

  // Get action dispatcher from context
  const { dispatch } = useActions()

  const handleAction = useCallback(dispatch, [dispatch])

  const { messages, isLoading, isSearching, searchQuery, error, sendMessage, clearMessages } = useChat({
    onAction: handleAction,
  })

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
