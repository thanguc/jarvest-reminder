import { useState, useEffect } from 'react'
import { JiraIssue } from '../../shared/types'
import NotificationShell from './NotificationShell'

export default function NoTimerNotification(): JSX.Element {
  const [tickets, setTickets] = useState<JiraIssue[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.jarvest.getJiraTickets()
      setTickets(result)
      setSelectedIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleStartTimer = async (): Promise<void> => {
    if (tickets.length === 0 || starting) return
    const selected = tickets[selectedIndex]
    setStarting(true)
    setError(null)
    try {
      await window.jarvest.startTimerForTicket(selected)
      window.jarvest.dismiss()
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
    window.jarvest.dismiss()
  }

  const hasTickets = tickets.length > 0

  return (
    <NotificationShell
      title="No Timer Running"
      actions={
        <>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dismiss
          </button>
          {hasTickets ? (
            <button
              onClick={handleStartTimer}
              disabled={starting}
              className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {starting ? 'Starting...' : 'Start Timer'}
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
          <svg className="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
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
        <div className="flex items-center gap-2">
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
            className="flex-1 text-sm border border-gray-300 rounded-md px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 truncate"
          >
            {tickets.map((ticket, i) => (
              <option key={ticket.id} value={i}>
                {ticket.key}: {ticket.fields.summary}
              </option>
            ))}
          </select>
          <button
            onClick={fetchTickets}
            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
            title="Refresh tickets"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}
    </NotificationShell>
  )
}
