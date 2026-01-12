import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/constants'
import { getAutoReturnConfigs, setAutoReturnConfigs, AutoReturnConfig } from '@/lib/simulated-date'

// GET - Get current auto-return configurations
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const configs = await getAutoReturnConfigs(supabase)

  // Enrich with book/checkout info
  const enrichedConfigs = await Promise.all(
    configs.map(async (config) => {
      const { data: checkout } = await supabase
        .from('checkouts')
        .select('id, status, due_date, book:books(id, title, author)')
        .eq('id', config.checkout_id)
        .single()

      return {
        ...config,
        checkout,
      }
    })
  )

  return NextResponse.json({ configs: enrichedConfigs })
}

// POST - Add or update auto-return configuration
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { checkout_id, return_date } = body

  if (!checkout_id || !return_date) {
    return NextResponse.json(
      { error: 'checkout_id and return_date are required' },
      { status: 400 }
    )
  }

  // Validate checkout exists
  const { data: checkout, error: checkoutError } = await supabase
    .from('checkouts')
    .select('id, book_id, status')
    .eq('id', checkout_id)
    .single()

  if (checkoutError || !checkout) {
    return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
  }

  // Get current configs
  const configs = await getAutoReturnConfigs(supabase)

  // Check if this checkout is already configured
  const existingIndex = configs.findIndex(c => c.checkout_id === checkout_id)

  const newConfig: AutoReturnConfig = {
    checkout_id,
    book_id: checkout.book_id,
    return_date: new Date(return_date).toISOString(),
    original_status: checkout.status as 'active' | 'overdue',
  }

  if (existingIndex >= 0) {
    configs[existingIndex] = newConfig
  } else {
    configs.push(newConfig)
  }

  const result = await setAutoReturnConfigs(supabase, configs, user.id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    config: newConfig,
    message: existingIndex >= 0 ? 'Auto-return updated' : 'Auto-return configured',
  })
}

// DELETE - Remove auto-return configuration
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const checkoutId = searchParams.get('checkout_id')

  if (!checkoutId) {
    return NextResponse.json(
      { error: 'checkout_id query parameter is required' },
      { status: 400 }
    )
  }

  const configs = await getAutoReturnConfigs(supabase)
  const filteredConfigs = configs.filter(c => c.checkout_id !== checkoutId)

  if (filteredConfigs.length === configs.length) {
    return NextResponse.json({ error: 'Auto-return config not found' }, { status: 404 })
  }

  const result = await setAutoReturnConfigs(supabase, filteredConfigs, user.id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Auto-return configuration removed',
  })
}
