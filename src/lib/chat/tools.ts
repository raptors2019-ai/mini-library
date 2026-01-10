import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const chatTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_books',
      description:
        'Search the library catalog for books. Use this when a user asks about finding books, looking for specific titles, authors, or topics. Always use this tool to verify what books are available before making recommendations.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'The search query - can be a book title, author name, genre, or topic description',
          },
          author: {
            type: 'string',
            description: 'Optional: Filter results to only show books by this author',
          },
          genre: {
            type: 'string',
            description: 'Optional: Filter results to only show books in this genre',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default 5, max 10)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_book_details',
      description:
        'Get detailed information about a specific book including full description, availability status, current checkout info, and waitlist count.',
      parameters: {
        type: 'object',
        properties: {
          book_id: {
            type: 'string',
            description: 'The UUID of the book to look up',
          },
        },
        required: ['book_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description:
        'Check if a specific book is currently available for checkout. Returns availability status, due date if checked out, and waitlist position count.',
      parameters: {
        type: 'object',
        properties: {
          book_id: {
            type: 'string',
            description: 'The UUID of the book to check',
          },
        },
        required: ['book_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recommendations',
      description:
        'Get personalized book recommendations for the user based on their reading history and preferences. Only provides personalized results for authenticated users.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['for-you', 'popular', 'new'],
            description:
              'Type of recommendations: "for-you" for personalized, "popular" for trending books, "new" for recent additions',
          },
          limit: {
            type: 'number',
            description: 'Number of recommendations to return (default 5)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_similar_books',
      description:
        'Find books similar to a specific book based on content, themes, writing style, and genre. Useful for "if you liked X, you might like Y" recommendations.',
      parameters: {
        type: 'object',
        properties: {
          book_id: {
            type: 'string',
            description: 'The UUID of the source book to find similar books for',
          },
          limit: {
            type: 'number',
            description: 'Number of similar books to return (default 5)',
          },
        },
        required: ['book_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_genres',
      description:
        'Get a list of all book genres available in the library catalog. Use this to help users explore by category or when they ask what types of books are available.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]
