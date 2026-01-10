import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'
import { GENRES } from '@/lib/constants'

export interface ClassifyRequest {
  query: string
}

export interface ClassifyResponse {
  success: boolean
  params: {
    search?: string
    genres?: string[]
    statuses?: string[]
  }
  explanation?: string
  error?: string
}

const SYSTEM_PROMPT = `You are a search query parser for a library catalog. Your job is to extract structured search parameters from natural language queries.

Available genres: ${GENRES.join(', ')}

Available statuses:
- available: Books that can be borrowed now
- checked_out: Books currently borrowed by others
- on_hold: Books that are reserved/on hold

Instructions:
1. Extract any genre filters mentioned (use exact genre names from the list above)
2. Extract any status filters mentioned
3. Extract remaining search terms (author names, title fragments, topics)
4. If the user wants "similar to" or "like" a specific book, put that book name in the search field
5. Be conservative - only extract what's clearly mentioned

Respond with a JSON object in this exact format:
{
  "search": "remaining search terms or empty string",
  "genres": ["Genre1", "Genre2"],
  "statuses": ["available"],
  "explanation": "brief explanation of what you extracted"
}

Only include fields that have values. Don't include empty arrays or empty strings.`

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ClassifyRequest = await request.json()
    const { query } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, params: {}, error: 'Query is required' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Parse this search query: "${query}"` },
      ],
      max_tokens: 200,
      temperature: 0.1, // Low temperature for consistent parsing
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0].message.content
    if (!content) {
      return NextResponse.json(
        { success: false, params: {}, error: 'No response from AI' },
        { status: 500 }
      )
    }

    const parsed = JSON.parse(content)

    // Validate and clean the response
    const params: ClassifyResponse['params'] = {}

    if (parsed.search && typeof parsed.search === 'string' && parsed.search.trim()) {
      params.search = parsed.search.trim()
    }

    if (Array.isArray(parsed.genres) && parsed.genres.length > 0) {
      // Only include valid genres
      const validGenres = parsed.genres.filter((g: string) =>
        GENRES.includes(g as typeof GENRES[number])
      )
      if (validGenres.length > 0) {
        params.genres = validGenres
      }
    }

    if (Array.isArray(parsed.statuses) && parsed.statuses.length > 0) {
      // Only include valid statuses
      const allowedStatuses = ['available', 'checked_out', 'on_hold']
      const filteredStatuses = parsed.statuses.filter((s: string) =>
        allowedStatuses.includes(s)
      )
      if (filteredStatuses.length > 0) {
        params.statuses = filteredStatuses
      }
    }

    return NextResponse.json({
      success: true,
      params,
      explanation: parsed.explanation,
    })
  } catch (error) {
    console.error('Search classification error:', error)
    return NextResponse.json(
      {
        success: false,
        params: {},
        error: error instanceof Error ? error.message : 'Failed to classify query',
      },
      { status: 500 }
    )
  }
}
