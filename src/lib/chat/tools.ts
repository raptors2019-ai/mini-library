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
        'Find books similar to a specific book based on content, themes, writing style, and genre. Useful for "if you liked X, you might like Y" recommendations. You can provide either a book_id (if you know it) OR a title to search for.',
      parameters: {
        type: 'object',
        properties: {
          book_id: {
            type: 'string',
            description: 'The UUID of the source book to find similar books for (if known)',
          },
          title: {
            type: 'string',
            description: 'The title of the book to find similar books for (will search the catalog first)',
          },
          limit: {
            type: 'number',
            description: 'Number of similar books to return (default 5)',
          },
        },
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
  {
    type: 'function',
    function: {
      name: 'lookup_book_external',
      description:
        'Search external book databases (Google Books) to find books that are NOT in our library catalog. Use this when search_books returns no results and the user wants a specific book. This helps identify the exact book with ISBN and details before submitting a request.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the book to search for',
          },
          author: {
            type: 'string',
            description: 'Optional: The author name to help narrow down results',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_book',
      description:
        'Submit a request to add a book to the library catalog. Use this AFTER using lookup_book_external to confirm the exact book details with the user. Only available for authenticated users. The request goes to librarians for review.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The confirmed book title',
          },
          author: {
            type: 'string',
            description: 'The confirmed author name',
          },
          isbn: {
            type: 'string',
            description: 'The ISBN from the lookup (important for auto-creating the book later)',
          },
          description: {
            type: 'string',
            description: 'Book description from the lookup',
          },
          cover_url: {
            type: 'string',
            description: 'Cover image URL from the lookup',
          },
          page_count: {
            type: 'number',
            description: 'Number of pages',
          },
          publish_date: {
            type: 'string',
            description: 'Publication date',
          },
          genres: {
            type: 'array',
            items: { type: 'string' },
            description: 'Book genres/categories',
          },
        },
        required: ['title', 'author'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_books_on_page',
      description:
        'Navigate the user to the books catalog page with specific filters applied. Use this when the user wants to see search results in the full page view rather than just in the chat. This gives them a better browsing experience with larger book cards and more details. Examples: "show me these on the page", "open in full view", "let me browse these".',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Optional search query to filter books by title, author, or topic',
          },
          genres: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional array of genres to filter by (e.g., ["Mystery", "Thriller"])',
          },
          statuses: {
            type: 'array',
            items: { type: 'string', enum: ['available', 'checked_out', 'on_hold'] },
            description: 'Optional array of availability statuses to filter by',
          },
        },
      },
    },
  },
]
