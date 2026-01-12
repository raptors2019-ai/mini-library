'use client'

import { Bot, User } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ChatBookCarousel } from './chat-book-carousel'
import type { ChatMessage as ChatMessageType } from '@/lib/chat/types'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const hasBooks = message.books && message.books.length > 0

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-2 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          )}
        >
          {message.content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-inherit prose-headings:text-inherit">
              <ReactMarkdown
                components={{
                  // Make links open in new tab and style them
                  a: ({ href, children }) => (
                    <Link
                      href={href || '#'}
                      className="text-primary underline hover:no-underline"
                      target={href?.startsWith('http') ? '_blank' : undefined}
                      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {children}
                    </Link>
                  ),
                  // Style paragraphs
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  // Style lists
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  // Style strong/bold text
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-current opacity-50 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-current opacity-50 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-current opacity-50 animate-bounce" />
            </div>
          )}
        </div>

        {/* Book cards carousel */}
        {hasBooks && (
          <div className="w-full">
            <ChatBookCarousel books={message.books!} />
          </div>
        )}
      </div>
    </div>
  )
}
