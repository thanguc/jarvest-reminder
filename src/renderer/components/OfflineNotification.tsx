import { useState, useRef } from 'react'
import NotificationShell from './NotificationShell'

const CLOSE_DELAY_SECONDS = 5

export default function OfflineNotification(): JSX.Element {
  const [option, setOption] = useState<'today' | 'manual'>('today')
  const [phase, setPhase] = useState<'choosing' | 'offline'>('choosing')
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null)
  const closeRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCloseCountdown = (): void => {
    let remaining = CLOSE_DELAY_SECONDS
    setCloseCountdown(remaining)
    closeRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        if (closeRef.current) clearInterval(closeRef.current)
        setCloseCountdown(0)
        window.jarvest.dismiss()
      } else {
        setCloseCountdown(remaining)
      }
    }, 1000)
  }

  const handleOfflineNow = async (): Promise<void> => {
    await window.jarvest.goOffline(option)
    setPhase('offline')
    startCloseCountdown()
  }

  const handleDismiss = (): void => {
    if (closeRef.current) clearInterval(closeRef.current)
    window.jarvest.dismiss()
  }

  return (
    <NotificationShell
      title="Go Offline"
      actions={
        phase === 'choosing' ? (
          <>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
            >
              Never mind
            </button>
            <button
              onClick={handleOfflineNow}
              className="px-4 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
            >
              Offline Now
            </button>
          </>
        ) : (
          <>
            {closeCountdown !== null && (
              <span className="text-xs text-gray-400 mr-auto">
                Closing in {closeCountdown}s…
              </span>
            )}
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
            >
              Dismiss
            </button>
          </>
        )
      }
    >
      {phase === 'choosing' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            In offline mode, you won't be reminded to start a timer. How long do you want to stay offline?
          </p>
          <div className="space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="offline-option"
                checked={option === 'today'}
                onChange={() => setOption('today')}
                className="mt-1.5 accent-[#1558BC]"
              />
              <div>
                <span className="text-sm text-gray-800 font-medium group-hover:text-gray-900">
                  Just today
                </span>
              </div>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="offline-option"
                checked={option === 'manual'}
                onChange={() => setOption('manual')}
                className="mt-1.5 accent-[#1558BC]"
              />
              <div>
                <span className="text-sm text-gray-800 font-medium group-hover:text-gray-900">
                  Until I go online again
                </span>
              </div>
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400 flex-shrink-0" />
            <p className="text-sm font-medium text-gray-800">You are now in offline mode.</p>
          </div>
          <p className="text-sm text-gray-600">
            Timer reminders are paused.{' '}
            {option === 'today'
              ? 'Checks will resume automatically tomorrow.'
              : 'Use "Go Online" from the tray menu to resume, or start a timer in Harvest.'}
          </p>
        </div>
      )}
    </NotificationShell>
  )
}
