import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get the current simulated date from system settings.
 * Returns null if no simulation is active (use real date).
 */
export async function getSimulatedDate(supabase: SupabaseClient): Promise<Date | null> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'simulated_date')
    .single()

  if (!data || data.value === null) {
    return null
  }

  // Parse the ISO date string stored in JSONB
  const dateStr = data.value as string
  if (typeof dateStr === 'string') {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  return null
}

/**
 * Get the current date for the system - either simulated or real.
 * Use this instead of `new Date()` for date comparisons.
 */
export async function getCurrentDate(supabase: SupabaseClient): Promise<Date> {
  const simulated = await getSimulatedDate(supabase)
  return simulated || new Date()
}

/**
 * Set the simulated date. Pass null to reset to real time.
 */
export async function setSimulatedDate(
  supabase: SupabaseClient,
  date: Date | null,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Store date string or null to reset
  const value = date ? date.toISOString() : null

  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key: 'simulated_date',
      value: value,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Calculate the number of days between two dates (ignoring time).
 */
export function daysBetween(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())
  const diffTime = d2.getTime() - d1.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if a checkout is overdue based on the current (possibly simulated) date.
 */
export function isOverdue(dueDate: Date, currentDate: Date): boolean {
  return daysBetween(dueDate, currentDate) > 0
}

/**
 * Check if a checkout is due soon (within X days) based on the current date.
 */
export function isDueSoon(dueDate: Date, currentDate: Date, daysThreshold: number = 2): boolean {
  const daysUntilDue = daysBetween(currentDate, dueDate)
  return daysUntilDue >= 0 && daysUntilDue <= daysThreshold
}

/**
 * Auto-return configuration stored in system_settings.
 * Maps checkout_id to the date it should auto-return.
 */
export interface AutoReturnConfig {
  checkout_id: string
  book_id: string
  return_date: string // ISO date string
  original_status: 'active' | 'overdue'
}

/**
 * Get auto-return configurations from system settings.
 */
export async function getAutoReturnConfigs(supabase: SupabaseClient): Promise<AutoReturnConfig[]> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'auto_return_checkouts')
    .single()

  if (!data || !data.value) {
    return []
  }

  return data.value as AutoReturnConfig[]
}

/**
 * Set auto-return configurations.
 */
export async function setAutoReturnConfigs(
  supabase: SupabaseClient,
  configs: AutoReturnConfig[],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key: 'auto_return_checkouts',
      value: configs,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
