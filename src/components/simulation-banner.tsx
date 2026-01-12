'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SimulatedDateState {
  simulatedDate: string | null
  isSimulating: boolean
}

export function SimulationBanner() {
  const [state, setState] = useState<SimulatedDateState | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/simulated-date')
      if (res.ok) {
        const data = await res.json()
        setState(data)
        // Reset dismissed state if simulation changes
        if (data.isSimulating) {
          setDismissed(false)
        }
      }
    } catch {
      // Ignore errors
    }
  }, [])

  useEffect(() => {
    fetchState()

    // Poll every 10 seconds to catch changes
    const interval = setInterval(fetchState, 10000)
    return () => clearInterval(interval)
  }, [fetchState])

  // Temporarily hidden - change false to true to re-enable
  const isEnabled = false
  if (!isEnabled || !state || !state.isSimulating || dismissed) {
    return null
  }

  const displayDate = new Date(state.simulatedDate!).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm flex items-center justify-center gap-2 relative">
      <Calendar className="h-4 w-4" />
      <span>
        <strong>Date Simulation Active:</strong> System is using {displayDate}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 h-6 w-6 p-0 hover:bg-amber-600 text-amber-950"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  )
}
