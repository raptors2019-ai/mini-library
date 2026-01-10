import { NextRequest } from 'next/server'
import {
  requireAuth,
  isErrorResponse,
  jsonError,
  jsonSuccess,
  getPaginationParams,
  createPaginationResponse,
} from '@/lib/api-utils'
import { createNotification, notificationTemplates } from '@/lib/notifications'

// GET - List user's book requests
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const { searchParams } = new URL(request.url)
  const { page, limit, offset } = getPaginationParams(searchParams)
  const status = searchParams.get('status')

  let query = supabase
    .from('book_requests')
    .select('*, book:books(*)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return jsonError(error.message, 500)

  return jsonSuccess({
    requests: data,
    pagination: createPaginationResponse(page, limit, count || 0),
  })
}

// POST - Create new book request
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (isErrorResponse(auth)) return auth

  const { user, supabase } = auth
  const body = await request.json()

  const { title, author, isbn, description, cover_url, page_count, publish_date, genres } = body

  if (!title || !author) {
    return jsonError('Title and author are required', 400)
  }

  // Check if user already has a pending request for this book
  const { data: existing } = await supabase
    .from('book_requests')
    .select('id')
    .eq('user_id', user.id)
    .ilike('title', title)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return jsonError(`You already have a pending request for "${title}"`, 400)
  }

  // Create the request
  const { data: bookRequest, error } = await supabase
    .from('book_requests')
    .insert({
      user_id: user.id,
      title,
      author,
      isbn: isbn || null,
      description: description || null,
      cover_url: cover_url || null,
      page_count: page_count || null,
      publish_date: publish_date || null,
      genres: genres || null,
    })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  // Get user's name for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const requesterName = profile?.full_name || profile?.email || 'A member'

  // Notify all admins about the new request
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['librarian', 'admin'])

  if (admins?.length) {
    const template = notificationTemplates.adminNewBookRequest(title, author, requesterName)
    for (const admin of admins) {
      await createNotification({
        supabase,
        userId: admin.id,
        type: template.type,
        title: template.title,
        message: template.message,
      })
    }
  }

  return jsonSuccess(bookRequest, 201)
}
