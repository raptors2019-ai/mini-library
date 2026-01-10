import type {
  ChatMessage,
  ToolCall,
  ChatRequest,
  SearchBooksArgs,
  StreamChunk,
} from './types'

describe('Chat Types', () => {
  describe('ChatMessage', () => {
    it('accepts valid user message', () => {
      const message: ChatMessage = {
        id: '123',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      }
      expect(message.role).toBe('user')
      expect(message.books).toBeUndefined()
    })

    it('accepts valid assistant message with books', () => {
      const message: ChatMessage = {
        id: '456',
        role: 'assistant',
        content: 'Here are some books',
        books: [
          {
            id: 'book-1',
            title: 'Test Book',
            author: 'Test Author',
            status: 'available',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            isbn: null,
            description: null,
            ai_summary: null,
            cover_url: null,
            page_count: null,
            publish_date: null,
            genres: null,
            embedding: null,
            review_summary: null,
            review_summary_generated_at: null,
            created_by: null,
          },
        ],
        timestamp: new Date(),
      }
      expect(message.role).toBe('assistant')
      expect(message.books?.length).toBe(1)
    })
  })

  describe('ToolCall', () => {
    it('accepts valid tool call', () => {
      const toolCall: ToolCall = {
        id: 'call_123',
        name: 'search_books',
        arguments: { query: 'science fiction' },
      }
      expect(toolCall.name).toBe('search_books')
    })
  })

  describe('ChatRequest', () => {
    it('accepts valid request with messages', () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      }
      expect(request.messages.length).toBe(2)
    })
  })

  describe('SearchBooksArgs', () => {
    it('requires query parameter', () => {
      const args: SearchBooksArgs = {
        query: 'mystery books',
      }
      expect(args.query).toBe('mystery books')
    })

    it('accepts optional parameters', () => {
      const args: SearchBooksArgs = {
        query: 'mystery',
        author: 'Agatha Christie',
        genre: 'Mystery',
        limit: 5,
      }
      expect(args.author).toBe('Agatha Christie')
      expect(args.limit).toBe(5)
    })
  })

  describe('StreamChunk', () => {
    it('accepts content chunk', () => {
      const chunk: StreamChunk = {
        type: 'content',
        content: 'Hello',
      }
      expect(chunk.type).toBe('content')
    })

    it('accepts tool_call chunk', () => {
      const chunk: StreamChunk = {
        type: 'tool_call',
        toolCall: {
          id: 'call_123',
          name: 'search_books',
          arguments: { query: 'test' },
        },
      }
      expect(chunk.type).toBe('tool_call')
      expect(chunk.toolCall?.name).toBe('search_books')
    })

    it('accepts error chunk', () => {
      const chunk: StreamChunk = {
        type: 'error',
        error: 'Something went wrong',
      }
      expect(chunk.type).toBe('error')
      expect(chunk.error).toBe('Something went wrong')
    })

    it('accepts done chunk', () => {
      const chunk: StreamChunk = {
        type: 'done',
      }
      expect(chunk.type).toBe('done')
    })
  })
})
