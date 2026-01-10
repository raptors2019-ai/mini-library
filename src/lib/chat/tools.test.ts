import { chatTools } from './tools'

describe('chatTools', () => {
  it('exports an array of tools', () => {
    expect(Array.isArray(chatTools)).toBe(true)
    expect(chatTools.length).toBeGreaterThan(0)
  })

  it('has all required tools defined', () => {
    const toolNames = chatTools.map((t) => t.function.name)

    expect(toolNames).toContain('search_books')
    expect(toolNames).toContain('get_book_details')
    expect(toolNames).toContain('check_availability')
    expect(toolNames).toContain('get_recommendations')
    expect(toolNames).toContain('find_similar_books')
    expect(toolNames).toContain('get_available_genres')
  })

  describe('search_books tool', () => {
    const searchTool = chatTools.find((t) => t.function.name === 'search_books')

    it('has correct structure', () => {
      expect(searchTool).toBeDefined()
      expect(searchTool?.type).toBe('function')
      expect(searchTool?.function.description).toBeDefined()
      expect(searchTool?.function.parameters).toBeDefined()
    })

    it('requires query parameter', () => {
      const params = searchTool?.function.parameters as {
        required?: string[]
        properties?: Record<string, unknown>
      }
      expect(params?.required).toContain('query')
    })

    it('has optional author, genre, and limit parameters', () => {
      const params = searchTool?.function.parameters as {
        properties?: Record<string, unknown>
      }
      expect(params?.properties).toHaveProperty('author')
      expect(params?.properties).toHaveProperty('genre')
      expect(params?.properties).toHaveProperty('limit')
    })
  })

  describe('get_book_details tool', () => {
    const tool = chatTools.find((t) => t.function.name === 'get_book_details')

    it('requires book_id parameter', () => {
      const params = tool?.function.parameters as { required?: string[] }
      expect(params?.required).toContain('book_id')
    })
  })

  describe('get_recommendations tool', () => {
    const tool = chatTools.find((t) => t.function.name === 'get_recommendations')

    it('has type parameter with enum values', () => {
      const params = tool?.function.parameters as {
        properties?: {
          type?: { enum?: string[] }
        }
      }
      expect(params?.properties?.type?.enum).toEqual(['for-you', 'popular', 'new'])
    })
  })

  describe('all tools have descriptions', () => {
    it('every tool has a non-empty description', () => {
      for (const tool of chatTools) {
        expect(tool.function.description).toBeDefined()
        expect(tool.function.description.length).toBeGreaterThan(10)
      }
    })
  })
})
