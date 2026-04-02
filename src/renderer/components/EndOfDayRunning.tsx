import { useState, useEffect, useRef } from 'react'
import { HarvestTimeEntry } from '../../shared/types'
import NotificationShell from './NotificationShell'

const AUTO_STOP_SECONDS = 60

export default function EndOfDayRunning(): JSX.Element {
  const [entry, setEntry] = useState<HarvestTimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_STOP_SECONDS)
  const [error, setError] = useState<string | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const handleStopTimer = async (): Promise<void> => {
    if (!entry || stopping) return
    setStopping(true)
    if (countdownRef.current) clearInterval(countdownRef.current)
    try {
      await window.jarvest.stopTimer(entry.id)
      window.jarvest.dismiss()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer')
      setStopping(false)
    }
  }

  const handleDismiss = (): void => {
    if (countdownRef.current) clearInterval(countdownRef.current)
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
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dismiss
          </button>
          <div className="flex flex-col items-center">
            <button
              onClick={handleStopTimer}
              disabled={stopping || !entry}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {stopping ? 'Stopping...' : 'Stop Timer'}
            </button>
            {countdown > 0 && !stopping && (
              <span className="text-xs text-gray-400 mt-1">
                Auto-stop in {countdown}s
              </span>
            )}
          </div>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
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
                <p className="text-lg font-bold text-emerald-600">
                  {formatHours(entry.hours)}
                </p>
                <div className="flex items-center gap-1 text-xs text-emerald-500">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
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
