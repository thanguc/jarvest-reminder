import { useState, useEffect, useRef } from 'react'
import { JiraIssue } from '../../shared/types'
import NotificationShell from './NotificationShell'

const AUTO_START_SECONDS = 60
const CLOSE_DELAY_SECONDS = 5

function TicketDropdown({
  tickets,
  selectedIndex,
  onSelect,
  onRefresh
}: {
  tickets: JiraIssue[]
  selectedIndex: number
  onSelect: (i: number) => void
  onRefresh: () => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = tickets[selectedIndex]
  const label = selected ? `${selected.key}: ${selected.fields.summary}` : ''

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div ref={ref} className="relative flex-1 min-w-0">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-1 text-sm border border-gray-300 rounded-md px-2.5 py-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC] text-left"
        >
          <span className="truncate">{label}</span>
          <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {tickets.map((ticket, i) => {
              const text = `${ticket.key}: ${ticket.fields.summary}`
              return (
                <li
                  key={ticket.id}
                  title={text}
                  onClick={() => { onSelect(i); setOpen(false) }}
                  className={`px-2.5 py-2 text-sm cursor-pointer truncate hover:bg-blue-50 ${i === selectedIndex ? 'bg-blue-50 text-[#1558BC] font-medium' : 'text-gray-800'}`}
                >
                  {text}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <button
        onClick={onRefresh}
        className="p-2 text-gray-500 hover:text-[#1558BC] hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
        title="Refresh tickets"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  )
}

export default function NoTimerNotification(): JSX.Element {
  const [tickets, setTickets] = useState<JiraIssue[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [started, setStarted] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_START_SECONDS)
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [withinWorkingHours, setWithinWorkingHours] = useState(false)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const closeCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const selectedIndexRef = useRef(0)

  const fetchTickets = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.jarvest.getJiraTickets()
      setTickets(result)
      setSelectedIndex(0)
      selectedIndexRef.current = 0
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
    window.jarvest.isWithinWorkingHours().then(setWithinWorkingHours)
  }, [])

  // Start auto-start countdown only during working hours
  useEffect(() => {
    if (tickets.length === 0 || !withinWorkingHours) return

    let remaining = AUTO_START_SECONDS
    setCountdown(remaining)
    countdownRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        setCountdown(0)
        handleStartTimer()
      } else {
        setCountdown(remaining)
      }
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [tickets, withinWorkingHours])

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

  const handleStartTimer = async (): Promise<void> => {
    if (tickets.length === 0 || starting || started) return
    const selected = tickets[selectedIndexRef.current]
    if (countdownRef.current) clearInterval(countdownRef.current)
    setStarting(true)
    setError(null)
    try {
      await window.jarvest.startTimerForTicket(selected)
      setStarting(false)
      setStarted(true)
      startCloseCountdown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer')
      setStarting(false)
    }
  }

  const handleBrowse = async (): Promise<void> => {
    const config = await window.jarvest.getConfig()
    const jql = encodeURIComponent(
      'assignee = currentUser() AND status in (Open, "To Do", "In Progress") ORDER BY updated DESC'
    )
    const url = `https://${config.jira.domain}.atlassian.net/issues/?jql=${jql}`
    window.jarvest.openExternal(url)
    window.jarvest.dismiss()
  }

  const handleDismiss = (): void => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (closeCountdownRef.current) clearInterval(closeCountdownRef.current)
    window.jarvest.dismiss()
  }

  const hasTickets = tickets.length > 0

  return (
    <NotificationShell
      title="No Timer Running"
      actions={
        <>
          {closeCountdown !== null ? (
            <span className="text-xs text-gray-400 mr-auto">
              Closing in {closeCountdown}s…
            </span>
          ) : hasTickets && !started && countdown > 0 && withinWorkingHours && (
            <span className="text-xs text-gray-400 mr-auto">
              Auto-start in {countdown}s
            </span>
          )}
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dismiss
          </button>
          {hasTickets ? (
            <button
              onClick={handleStartTimer}
              disabled={starting || started}
              className="px-4 py-1.5 text-sm bg-[#1558BC] text-white rounded-md hover:bg-[#0f4a9e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {starting ? 'Starting…' : started ? 'Started' : 'Start Timer'}
            </button>
          ) : (
            <button
              onClick={handleBrowse}
              disabled={loading}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              Browse
            </button>
          )}
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-3">
        You don't have a Harvest timer running. Select a ticket to start tracking time:
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <svg className="animate-spin h-5 w-5 text-[#1558BC]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-2 text-sm text-gray-500">Loading tickets...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-2.5">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      ) : !hasTickets ? (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5">
          <p className="text-sm text-amber-800">
            You have no in-progress tickets. Click Browse to view all your open issues in Jira.
          </p>
        </div>
      ) : (
        <TicketDropdown
          tickets={tickets}
          selectedIndex={selectedIndex}
          onSelect={(i) => { selectedIndexRef.current = i; setSelectedIndex(i) }}
          onRefresh={fetchTickets}
        />
      )}
    </NotificationShell>
  )
}
