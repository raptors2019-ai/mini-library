import OpenAI from 'openai'

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

/**
 * Generate an embedding vector for the given text
 * Uses text-embedding-3-small (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

/**
 * Generate a concise AI summary for a book
 */
export async function generateBookSummary(book: {
  title: string
  author: string
  description?: string | null
  genres?: string[] | null
}): Promise<string> {
  const openai = getOpenAIClient()
  const genreText = book.genres?.length ? `Genres: ${book.genres.join(', ')}` : ''

  const prompt = `Write a concise 2-3 sentence summary of this book that would help someone decide if they want to read it.

Title: ${book.title}
Author: ${book.author}
${book.description ? `Description: ${book.description}` : ''}
${genreText}

Write only the summary, no introduction or labels.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150,
    temperature: 0.7,
  })

  return response.choices[0].message.content?.trim() || ''
}

/**
 * Generate genres for a book based on its title and description
 */
export async function generateGenres(book: {
  title: string
  author: string
  description?: string | null
}): Promise<string[]> {
  const openai = getOpenAIClient()
  const prompt = `Based on this book's information, suggest 2-4 relevant genre tags.

Title: ${book.title}
Author: ${book.author}
${book.description ? `Description: ${book.description}` : ''}

Return only a comma-separated list of genres, nothing else. Example: Science Fiction, Dystopian, Political`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 50,
    temperature: 0.5,
  })

  const content = response.choices[0].message.content?.trim() || ''
  return content.split(',').map(g => g.trim()).filter(Boolean)
}

/**
 * Create embedding text from book data
 */
export function createEmbeddingText(book: {
  title: string
  author: string
  description?: string | null
  ai_summary?: string | null
  genres?: string[] | null
}): string {
  const parts = [
    book.title,
    `by ${book.author}`,
    book.description,
    book.ai_summary,
    book.genres?.length ? `Genres: ${book.genres.join(', ')}` : null,
  ].filter(Boolean)

  return parts.join('. ')
}
