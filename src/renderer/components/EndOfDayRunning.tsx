import { useState, useEffect, useRef } from 'react'
import { HarvestTimeEntry } from '../../shared/types'
import NotificationShell from './NotificationShell'

const AUTO_STOP_SECONDS = 60
const CLOSE_DELAY_SECONDS = 5

export default function EndOfDayRunning(): JSX.Element {
  const [entry, setEntry] = useState<HarvestTimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [stopped, setStopped] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_STOP_SECONDS)
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const closeCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const fetchTimer = async (): Promise<void> => {
      try {
        const timer = await window.jarvest.getRunningTimer()
        setEntry(timer)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch timer')
      } finally {
        setLoading(false)
      }
    }
    fetchTimer()
  }, [])

  // Start countdown when entry is loaded
  useEffect(() => {
    if (!entry) return

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-stop
          if (countdownRef.current) clearInterval(countdownRef.current)
          handleStopTimer()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [entry])

  const startCloseCountdown = (): void => {
    let remaining = CLOSE_DELAY_SECONDS
    setCloseCountdown(remaining)
    closeCountdownRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        if (closeCountdownRef.current) clearInterval(closeCountdownRef.current)
        setCloseCountdown(0)
        window.jarvest.dismiss()
      } else {
        setCloseCountdown(remaining)
      }
    }, 1000)
  }

  const handleStopTimer = async (): Promise<void> => {
    if (!entry || stopping || stopped) return
    setStopping(true)
    if (countdownRef.current) clearInterval(countdownRef.current)
    try {
      await window.jarvest.stopTimer(entry.id)
      setStopping(false)
      setStopped(true)
      const withinWorkingHours = await window.jarvest.isWithinWorkingHours()
      if (!withinWorkingHours) {
        window.jarvest.showEodSummary()
      } else {
        startCloseCountdown()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer')
      setStopping(false)
    }
  }

  const handleDismiss = (): void => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (closeCountdownRef.current) clearInterval(closeCountdownRef.current)
    if (entry && !stopped) {
      window.jarvest.rescheduleEodCheck()
    }
    window.jarvest.dismiss()
  }

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  return (
    <NotificationShell
      title="Timer Still Running"
      actions={
        <>
          {closeCountdown !== null ? (
            <span className="text-xs text-gray-400 mr-auto">
              Closing in {closeCountdown}s…
            </span>
          ) : countdown > 0 && !stopping && (
            <span className="text-xs text-gray-400 mr-auto">
              Auto-stop in {countdown}s
            </span>
          )}
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleStopTimer}
            disabled={stopping || stopped || !entry}
            className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {stopping ? 'Stopping…' : stopped ? 'Stopped' : 'Stop Timer'}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-5 w-5 text-[#1558BC]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      ) : entry ? (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-sm text-amber-800">
              It's the end of your work day but you still have a timer running.
            </p>
          </div>

          <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {entry.project.name}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {entry.notes || entry.task.name}
                </p>
              </div>
              <div className="ml-3 text-right flex-shrink-0">
                <p className="text-lg font-bold text-[#1558BC]">
                  {formatHours(entry.hours)}
                </p>
                <div className="flex items-center gap-1 text-xs text-[#1558BC]">
                  <span className="w-1.5 h-1.5 bg-[#1558BC] rounded-full animate-pulse" />
                  Running
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">No running timer found.</p>
      )}
    </NotificationShell>
  )
}
