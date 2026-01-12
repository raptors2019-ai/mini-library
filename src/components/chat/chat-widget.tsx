'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChatBubble } from './chat-bubble'
import { ChatWindow } from './chat-window'
import { useChat } from '@/hooks/use-chat'
import { useActions, useAppContext } from '@/context/action-context'

export function ChatWidget(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false)

  // Get action dispatcher and context from provider
  const { dispatch } = useActions()
  const appContext = useAppContext()

  const handleAction = useCallback(dispatch, [dispatch])

  // Build chat context from app context
  const chatContext = useMemo(() => ({
    currentBookId: appContext.currentBookId,
    currentPath: appContext.currentPath,
  }), [appContext.currentBookId, appContext.currentPath])

  const { messages, isLoading, isSearching, searchQuery, error, sendMessage, clearMessages } = useChat({
    onAction: handleAction,
    context: chatContext,
  })

  function handleOpen(): void {
    setIsOpen(true)
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
        currentBookTitle={appContext.currentBookId ? 'current' : undefined}
      />
    )
  }

  return <ChatBubble onClick={handleOpen} />
}
