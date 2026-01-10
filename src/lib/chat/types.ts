import type { Book } from '@/types/database'

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
  book_id: string
  limit?: number
}

export type ToolArgs =
  | SearchBooksArgs
  | GetBookDetailsArgs
  | CheckAvailabilityArgs
  | GetRecommendationsArgs
  | FindSimilarBooksArgs
  | Record<string, never> // for get_available_genres

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'tool_result' | 'done' | 'error'
  content?: string
  toolCall?: ToolCall
  toolResult?: { books?: Book[]; data?: unknown }
  error?: string
}
