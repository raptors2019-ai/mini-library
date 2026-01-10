import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { chatTools } from '@/lib/chat/tools'
import { getSystemPrompt } from '@/lib/chat/system-prompt'
import { executeTool } from '@/lib/chat/execute-tool'
import type { ChatRequest, StreamChunk } from '@/lib/chat/types'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const MAX_TOOL_ROUNDS = 5 // Prevent infinite loops

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: ChatRequest = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // Get user context if authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userContext = {
      isAuthenticated: false,
      userName: undefined as string | undefined,
      favoriteGenres: undefined as string[] | undefined,
      recentBooks: undefined as string[] | undefined,
    }

    if (user) {
      userContext.isAuthenticated = true

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profile?.full_name) {
        userContext.userName = profile.full_name
      }

      // Get preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('favorite_genres')
        .eq('user_id', user.id)
        .single()

      if (prefs?.favorite_genres?.length) {
        userContext.favoriteGenres = prefs.favorite_genres
      }

      // Get recent reads
      const { data: recentBooks } = await supabase
        .from('user_books')
        .select('book:books(title)')
        .eq('user_id', user.id)
        .eq('status', 'read')
        .order('updated_at', { ascending: false })
        .limit(5)

      if (recentBooks?.length) {
        userContext.recentBooks = recentBooks
          .map((rb) => {
            const book = rb.book as unknown as { title: string } | null
            return book?.title
          })
          .filter((t): t is string => !!t)
      }
    }

    const systemPrompt = getSystemPrompt(userContext)
    const openai = getOpenAIClient()

    // Build initial messages for OpenAI
    const conversationMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // Create streaming response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (chunk: StreamChunk) => {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
        }

        try {
          let currentMessages = [...conversationMessages]
          let toolRound = 0

          // Loop to handle multiple tool call rounds
          while (toolRound < MAX_TOOL_ROUNDS) {
            const response = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: currentMessages,
              tools: chatTools,
              stream: true,
            })

            let assistantContent = ''
            const toolCalls: Array<{
              id: string
              name: string
              arguments: string
            }> = []
            let hasToolCalls = false

            // Process stream
            for await (const chunk of response) {
              const delta = chunk.choices[0]?.delta

              // Handle content
              if (delta?.content) {
                assistantContent += delta.content
                sendChunk({ type: 'content', content: delta.content })
              }

              // Handle tool calls
              if (delta?.tool_calls) {
                hasToolCalls = true
                for (const toolCall of delta.tool_calls) {
                  const index = toolCall.index

                  if (!toolCalls[index]) {
                    toolCalls[index] = {
                      id: toolCall.id || '',
                      name: toolCall.function?.name || '',
                      arguments: '',
                    }
                  }

                  if (toolCall.id) {
                    toolCalls[index].id = toolCall.id
                  }
                  if (toolCall.function?.name) {
                    toolCalls[index].name = toolCall.function.name
                  }
                  if (toolCall.function?.arguments) {
                    toolCalls[index].arguments += toolCall.function.arguments
                  }
                }
              }
            }

            // If no tool calls, we're done
            if (!hasToolCalls || toolCalls.length === 0) {
              break
            }

            // Execute tool calls
            const toolResults: ChatCompletionMessageParam[] = []

            for (const tc of toolCalls) {
              if (!tc.name || !tc.id) continue

              let args: Record<string, unknown> = {}
              try {
                args = JSON.parse(tc.arguments || '{}')
              } catch {
                args = {}
              }

              sendChunk({
                type: 'tool_call',
                toolCall: { id: tc.id, name: tc.name, arguments: args },
              })

              // Execute the tool
              const result = await executeTool(tc.name, args, user?.id)

              sendChunk({
                type: 'tool_result',
                toolResult: { books: result.books, data: result.data },
              })

              toolResults.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              })
            }

            // Add assistant message with tool calls and tool results to conversation
            currentMessages = [
              ...currentMessages,
              {
                role: 'assistant',
                content: assistantContent || null,
                tool_calls: toolCalls.map((tc) => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: {
                    name: tc.name,
                    arguments: tc.arguments,
                  },
                })),
              },
              ...toolResults,
            ]

            toolRound++
          }

          sendChunk({ type: 'done' })
        } catch (error) {
          console.error('Chat stream error:', error)
          sendChunk({
            type: 'error',
            error: error instanceof Error ? error.message : 'Chat failed',
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
