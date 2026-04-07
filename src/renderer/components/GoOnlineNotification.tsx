import { useState, useEffect } from 'react'
import NotificationShell from './NotificationShell'

const CLOSE_DELAY_SECONDS = 5

export default function GoOnlineNotification(): JSX.Element {
  const [closeCountdown, setCloseCountdown] = useState(CLOSE_DELAY_SECONDS)

  const reason = new URLSearchParams(window.location.search).get('reason')
  const isTimerDetected = reason === 'timer-detected'

  useEffect(() => {
    let remaining = CLOSE_DELAY_SECONDS
    const interval = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(interval)
        setCloseCountdown(0)
        window.jarvest.dismiss()
      } else {
        setCloseCountdown(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleDismiss = (): void => {
    window.jarvest.dismiss()
  }

  return (
    <NotificationShell
      title="Back Online"
      actions={
        <>
          <span className="text-xs text-gray-400 mr-auto">
            Closing in {closeCountdown}s…
          </span>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dismiss
          </button>
        </>
      }
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
          <p className="text-sm font-medium text-gray-800">You're back online.</p>
        </div>
        <p className="text-sm text-gray-600">
          {isTimerDetected
            ? 'A running timer was detected in Harvest. You\'ve been switched back to online mode automatically.'
            : 'Timer checks and reminders have resumed.'}
        </p>
      </div>
    </NotificationShell>
  )
}
