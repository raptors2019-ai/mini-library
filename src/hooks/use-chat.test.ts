/**
 * Tests for useChat hook
 */

import { renderHook, act } from '@testing-library/react'
import { useChat } from './use-chat'

// Add TextEncoder/TextDecoder polyfill for Node environment
import { TextEncoder, TextDecoder } from 'util'
Object.assign(global, { TextEncoder, TextDecoder })

// Mock crypto.randomUUID
const mockUUID = jest.fn()
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockUUID,
  },
})

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

const encoder = new TextEncoder()

function createStreamingResponse(chunks: object[]): { ok: true; body: ReadableStream<Uint8Array> } {
  const encoded = encoder.encode(chunks.map(c => JSON.stringify(c)).join('\n'))
  let readCount = 0
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: jest.fn().mockImplementation(() => {
          if (readCount === 0) {
            readCount++
            return Promise.resolve({ done: false, value: encoded })
          }
          return Promise.resolve({ done: true, value: undefined })
        }),
      }),
    } as unknown as ReadableStream<Uint8Array>,
  }
}

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUUID.mockReturnValue('test-uuid-123')
  })

  describe('initial state', () => {
    it('returns empty messages array', () => {
      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toEqual([])
    })

    it('returns isLoading as false', () => {
      const { result } = renderHook(() => useChat())

      expect(result.current.isLoading).toBe(false)
    })

    it('returns isSearching as false', () => {
      const { result } = renderHook(() => useChat())

      expect(result.current.isSearching).toBe(false)
    })

    it('returns searchQuery as null', () => {
      const { result } = renderHook(() => useChat())

      expect(result.current.searchQuery).toBeNull()
    })

    it('returns error as null', () => {
      const { result } = renderHook(() => useChat())

      expect(result.current.error).toBeNull()
    })
  })

  describe('sendMessage', () => {
    it('does nothing for empty message', async () => {
      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('')
      })

      expect(result.current.messages).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('does nothing for whitespace-only message', async () => {
      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('   ')
      })

      expect(result.current.messages).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('adds both user and assistant messages', async () => {
      mockFetch.mockResolvedValue(createStreamingResponse([
        { type: 'content', content: 'Response' },
        { type: 'done' },
      ]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.messages).toHaveLength(2)
      const roles = result.current.messages.map(m => m.role)
      expect(roles).toContain('user')
      expect(roles).toContain('assistant')
    })

    it('sets isLoading true during request', async () => {
      let resolvePromise: () => void
      const responsePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockImplementation(() => responsePromise.then(() => ({
        ok: true,
        body: {
          getReader: () => ({
            read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      })))

      const { result } = renderHook(() => useChat())

      // Start sending without awaiting
      let sendPromise: Promise<void>
      act(() => {
        sendPromise = result.current.sendMessage('Hello')
      })

      // Should be loading
      expect(result.current.isLoading).toBe(true)

      // Resolve and wait for completion
      await act(async () => {
        resolvePromise!()
        await sendPromise
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('handles fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.isLoading).toBe(false)
    })

    it('handles non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.error).toBe('Failed to send message')
    })

    it('handles missing response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: null,
      })

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.error).toBe('No response stream')
    })

    it('processes content chunks', async () => {
      mockFetch.mockResolvedValue(createStreamingResponse([
        { type: 'content', content: 'Hello ' },
        { type: 'content', content: 'world!' },
        { type: 'done' },
      ]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hi')
      })

      const assistantMessage = result.current.messages.find(m => m.role === 'assistant')
      expect(assistantMessage?.content).toBe('Hello world!')
    })

    it('handles tool_call for search_books', async () => {
      mockFetch.mockResolvedValue(createStreamingResponse([
        { type: 'tool_call', toolCall: { name: 'search_books', arguments: { query: 'mystery' } } },
        { type: 'done' },
      ]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Find mystery books')
      })

      expect(result.current.isSearching).toBe(false)
    })

    it('handles tool_result with books', async () => {
      const mockBooks = [
        { id: 'book-1', title: 'Mystery Book', author: 'Author 1' },
        { id: 'book-2', title: 'Another Mystery', author: 'Author 2' },
      ]

      mockFetch.mockResolvedValue(createStreamingResponse([
        { type: 'tool_call', toolCall: { name: 'search_books', arguments: { query: 'mystery' } } },
        { type: 'tool_result', toolResult: { books: mockBooks } },
        { type: 'done' },
      ]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Find mystery books')
      })

      const assistantMessage = result.current.messages.find(m => m.role === 'assistant')
      expect(assistantMessage?.books).toHaveLength(2)
      expect(assistantMessage?.searchQuery).toBe('mystery')
    })

    it('calls onAction for action chunks', async () => {
      const onAction = jest.fn()
      const mockAction = { type: 'open_book', payload: { bookId: 'book-123' } }

      mockFetch.mockResolvedValue(createStreamingResponse([
        { type: 'action', action: mockAction },
        { type: 'done' },
      ]))

      const { result } = renderHook(() => useChat({ onAction }))

      await act(async () => {
        await result.current.sendMessage('Open a book')
      })

      expect(onAction).toHaveBeenCalledWith(mockAction)
    })

    it('handles error chunks', async () => {
      mockFetch.mockResolvedValue(createStreamingResponse([
        { type: 'error', error: 'Something went wrong' },
      ]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.error).toBe('Something went wrong')
    })

    it('passes context to API', async () => {
      mockFetch.mockResolvedValue(createStreamingResponse([{ type: 'done' }]))

      const context = { currentBookId: 'book-123' }
      const { result } = renderHook(() => useChat({ context }))

      await act(async () => {
        await result.current.sendMessage('Tell me more')
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"currentBookId":"book-123"'),
      })
    })
  })

  describe('clearMessages', () => {
    it('clears all messages', async () => {
      mockFetch.mockResolvedValue(createStreamingResponse([{ type: 'done' }]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.messages.length).toBeGreaterThan(0)

      act(() => {
        result.current.clearMessages()
      })

      expect(result.current.messages).toEqual([])
    })

    it('clears error state', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.error).toBe('Network error')

      act(() => {
        result.current.clearMessages()
      })

      expect(result.current.error).toBeNull()
    })

    it('clears search state', async () => {
      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.clearMessages()
      })

      expect(result.current.isSearching).toBe(false)
      expect(result.current.searchQuery).toBeNull()
    })
  })

  describe('find_similar_books tool', () => {
    it('creates semantic search query for similar books', async () => {
      const mockBooks = [{ id: 'book-1', title: 'Similar Book', author: 'Author' }]

      mockFetch.mockResolvedValue(createStreamingResponse([
        { type: 'tool_call', toolCall: { name: 'find_similar_books', arguments: { title: 'The Great Gatsby' } } },
        { type: 'tool_result', toolResult: { books: mockBooks } },
        { type: 'done' },
      ]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Find books similar to The Great Gatsby')
      })

      const assistantMessage = result.current.messages.find(m => m.role === 'assistant')
      expect(assistantMessage?.searchQuery).toBe('books similar to The Great Gatsby')
    })
  })
})
