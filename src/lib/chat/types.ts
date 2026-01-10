import type { Book } from '@/types/database'
import type { AppAction } from '@/lib/actions/types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  books?: Book[]
  timestamp: Date
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  result: unknown
}

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface SearchBooksArgs {
  query: string
  author?: string
  genre?: string
  limit?: number
}

export interface GetBookDetailsArgs {
  book_id: string
}

export interface CheckAvailabilityArgs {
  book_id: string
}

export interface GetRecommendationsArgs {
  type?: 'for-you' | 'popular' | 'new'
  limit?: number
}

export interface FindSimilarBooksArgs {
  book_id?: string
  title?: string
  limit?: number
}

export interface LookupBookExternalArgs {
  title: string
  author?: string
}

export interface RequestBookArgs {
  title: string
  author: string
  isbn?: string
  description?: string
  cover_url?: string
  page_count?: number
  publish_date?: string
  genres?: string[]
}

export interface ShowBooksOnPageArgs {
  search?: string
  genres?: string[]
  statuses?: string[]
}

export type ToolArgs =
  | SearchBooksArgs
  | GetBookDetailsArgs
  | CheckAvailabilityArgs
  | GetRecommendationsArgs
  | FindSimilarBooksArgs
  | LookupBookExternalArgs
  | RequestBookArgs
  | ShowBooksOnPageArgs
  | Record<string, never> // for get_available_genres

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'tool_result' | 'action' | 'done' | 'error'
  content?: string
  toolCall?: ToolCall
  toolResult?: { books?: Book[]; data?: unknown }
  action?: AppAction
  error?: string
}
