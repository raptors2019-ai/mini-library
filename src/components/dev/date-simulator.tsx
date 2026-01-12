'use client'

import { useState, useEffect } from 'react'
import { Calendar, ChevronDown, RotateCcw, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'

interface SimulatedDateState {
  simulatedDate: string | null
  isSimulating: boolean
  realDate: string
}

export function DateSimulator() {
  const [state, setState] = useState<SimulatedDateState | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [inputDate, setInputDate] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchState()
  }, [])

  async function fetchState() {
    try {
      const res = await fetch('/api/admin/simulated-date')
      if (res.ok) {
        const data = await res.json()
        setState(data)
        if (data.simulatedDate) {
          setInputDate(data.simulatedDate.split('T')[0])
        }
      }
    } catch {
      // Ignore errors
    } finally {
      setInitialLoading(false)
    }
  }

  async function setSimulatedDate(date: string | null) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/simulated-date', {
        method: date ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: date ? JSON.stringify({ date }) : undefined,
      })

      if (res.ok) {
        const data = await res.json()
        setOpen(false)

        // Show toast then hard refresh
        if (data.notificationsGenerated > 0) {
          toast.success(`Date set! Generated ${data.notificationsGenerated} notification(s)`)
        } else if (date) {
          toast.success('Simulated date updated')
        } else {
          toast.success('Reset to real time')
        }

        // Hard refresh to ensure all components re-fetch data with new date
        setTimeout(() => window.location.reload(), 500)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update date')
        setLoading(false)
      }
    } catch {
      toast.error('Failed to update date')
      setLoading(false)
    }
  }

  function handleApply() {
    if (inputDate) {
      setSimulatedDate(inputDate)
    }
  }

  function handleReset() {
    setSimulatedDate(null)
    setInputDate('')
  }

  function handleQuickJump(days: number) {
    const baseDate = state?.simulatedDate
      ? new Date(state.simulatedDate)
      : new Date()
    baseDate.setDate(baseDate.getDate() + days)
    const newDate = baseDate.toISOString().split('T')[0]
    setInputDate(newDate)
    setSimulatedDate(newDate)
  }

  // Show loading skeleton while fetching initial state
  if (initialLoading) {
    return (
      <Button variant="outline" size="sm" className="gap-2 border-dashed border-gray-400/50" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    )
  }

  // Use default state if fetch failed - still show the component
  const effectiveState = state || {
    simulatedDate: null,
    isSimulating: false,
    realDate: new Date().toISOString(),
  }

  const displayDate = effectiveState.simulatedDate
    ? new Date(effectiveState.simulatedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Real Time'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${
            effectiveState.isSimulating
              ? 'border-dashed border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'border-dashed border-gray-400/50'
          }`}
          disabled={loading}
        >
          {effectiveState.isSimulating ? (
            <Calendar className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {effectiveState.isSimulating ? 'SIM:' : ''}
          </span>
          <span>{displayDate}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Date Simulation</h4>
            <p className="text-xs text-muted-foreground">
              Simulate a different date to test due dates, overdue notifications, and reminders.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Set Date</label>
            <input
              type="date"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!inputDate || loading}
              className="flex-1"
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={!effectiveState.isSimulating || loading}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Quick Jump</p>
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => handleQuickJump(1)}
              >
                +1 day
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => handleQuickJump(7)}
              >
                +1 week
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => handleQuickJump(14)}
              >
                +2 weeks
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => handleQuickJump(-1)}
              >
                -1 day
              </Button>
            </div>
          </div>

          {effectiveState.isSimulating && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2 text-xs text-amber-600 dark:text-amber-400">
              <strong>Simulation active.</strong> The system is using {displayDate} instead of real time.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
