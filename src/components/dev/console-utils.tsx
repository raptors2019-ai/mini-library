'use client'

import { useEffect } from 'react'

/**
 * Exposes demo utilities on window for controlling time simulation from browser console.
 *
 * Usage in browser console:
 *   demo.setDate('2025-01-20')  - Set specific date
 *   demo.addDays(7)             - Jump forward 7 days
 *   demo.addDays(-3)            - Jump back 3 days
 *   demo.reset()                - Reset to real time
 *   demo.status()               - Show current simulation status
 *   demo.help()                 - Show available commands
 */

interface DemoUtils {
  setDate: (date: string) => Promise<void>
  addDays: (days: number) => Promise<void>
  reset: () => Promise<void>
  status: () => Promise<void>
  help: () => void
}

declare global {
  interface Window {
    demo: DemoUtils
  }
}

export function ConsoleUtils() {
  // Set to true to enable demo console utilities
  const isEnabled = true

  useEffect(() => {
    if (!isEnabled) return
    const utils: DemoUtils = {
      async setDate(date: string) {
        console.log(`⏰ Setting date to ${date}...`)
        const res = await fetch('/api/admin/simulated-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date }),
        })
        if (res.ok) {
          const data = await res.json()
          console.log(`✅ Date set to ${date}`)
          if (data.notificationsGenerated > 0) {
            console.log(`📬 Generated ${data.notificationsGenerated} notification(s)`)
          }
          console.log('💡 Press F5 or Cmd+R to refresh and see changes')
        } else {
          const error = await res.json()
          console.error(`❌ Failed: ${error.error}`)
        }
      },

      async addDays(days: number) {
        // First get current date
        const statusRes = await fetch('/api/admin/simulated-date')
        const status = await statusRes.json()

        const baseDate = status.simulatedDate
          ? new Date(status.simulatedDate)
          : new Date()

        baseDate.setDate(baseDate.getDate() + days)
        const newDate = baseDate.toISOString().split('T')[0]

        console.log(`⏰ ${days > 0 ? 'Advancing' : 'Going back'} ${Math.abs(days)} day(s) to ${newDate}...`)
        await utils.setDate(newDate)
      },

      async reset() {
        console.log('⏰ Resetting to real time...')
        const res = await fetch('/api/admin/simulated-date', {
          method: 'DELETE',
        })
        if (res.ok) {
          const data = await res.json()
          console.log('✅ Reset to real time')
          if (data.notificationsDeleted > 0) {
            console.log(`🗑️ Cleaned up ${data.notificationsDeleted} simulation notification(s)`)
          }
          if (data.autoReturnsReverted > 0) {
            console.log(`↩️ Reverted ${data.autoReturnsReverted} auto-return(s)`)
          }
          console.log('💡 Press F5 or Cmd+R to refresh and see changes')
        } else {
          const error = await res.json()
          console.error(`❌ Failed: ${error.error}`)
        }
      },

      async status() {
        const res = await fetch('/api/admin/simulated-date')
        const data = await res.json()

        if (data.isSimulating) {
          const simDate = new Date(data.simulatedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
          console.log(`📅 Simulation ACTIVE: ${simDate}`)
        } else {
          console.log('📅 Real time (no simulation)')
        }
        console.log(`🕐 Real date: ${new Date(data.realDate).toLocaleDateString()}`)
      },

      help() {
        console.log(`
🎮 Demo Console Utilities
═══════════════════════════════════════

  demo.setDate('2025-01-20')  Set specific date
  demo.addDays(7)             Jump forward 7 days
  demo.addDays(-3)            Jump back 3 days
  demo.reset()                Reset to real time
  demo.status()               Show current simulation status
  demo.help()                 Show this help

📝 Examples:
  demo.setDate('2025-02-01')  // Set to Feb 1, 2025
  demo.addDays(14)            // Fast forward 2 weeks
  demo.reset()                // Back to real time
        `.trim())
      }
    }

    window.demo = utils

    // Log availability on mount
    console.log('🎮 Demo utils loaded. Type demo.help() for commands.')

    return () => {
      // @ts-expect-error - cleaning up global
      delete window.demo
    }
  }, [])

  return null
}
