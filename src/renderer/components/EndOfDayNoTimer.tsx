import { useState, useEffect } from 'react'
import NotificationShell from './NotificationShell'

export default function EndOfDayNoTimer(): JSX.Element {
  const [totalHours, setTotalHours] = useState<number | null>(null)
  const [loggedDate, setLoggedDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHours = async (): Promise<void> => {
      try {
        const d = new Date()
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const hours = await window.jarvest.getDailyHours(today)
        setTotalHours(hours)
        setLoggedDate(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hours')
      } finally {
        setLoading(false)
      }
    }
    fetchHours()
  }, [])

  const handleEdit = async (): Promise<void> => {
    const today = new Date().toISOString().split('T')[0]
    const url = `https://harvestapp.com/time/day/${today.replace(/-/g, '/')}`
    window.jarvest.openExternal(url)
    window.jarvest.dismiss()
  }

  const handleDismiss = (): void => {
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
      title="Daily Summary"
      actions={
        <>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleEdit}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Edit on Harvest
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
      ) : (
        <div className="text-center py-4">
          <div className="mb-2">
            <svg className="w-10 h-10 mx-auto text-[#1558BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7v5l3 3" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm mb-1">Time logged today{loggedDate ? ` (${loggedDate})` : ''}</p>
          <p className="text-3xl font-bold text-gray-800">
            {totalHours !== null ? formatHours(totalHours) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Click Edit to review your time entries in Harvest
          </p>
        </div>
      )}
    </NotificationShell>
  )
}
