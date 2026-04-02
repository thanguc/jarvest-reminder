import { useState, useEffect } from 'react'
import NotificationShell from './NotificationShell'

const CHANGELOG_URL = 'https://github.com/thanguc/jarvest-reminder/releases'

export default function UpdateSuccessNotification(): JSX.Element {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    window.jarvest.getUpdateInfo().then((info) => {
      setVersion(info.currentVersion)
    })
  }, [])

  const handleDismiss = (): void => {
    window.jarvest.dismiss()
  }

  const handleViewChangelog = (): void => {
    const url = version
      ? `${CHANGELOG_URL}/tag/v${version}`
      : CHANGELOG_URL
    window.jarvest.openExternal(url)
    window.jarvest.dismiss()
  }

  return (
    <NotificationShell
      title="Update Complete"
      actions={
        <>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleViewChangelog}
            className="px-4 py-1.5 text-sm bg-[#1558BC] text-white rounded-md hover:bg-[#0f4a9e] transition-colors font-medium"
          >
            View Changelog
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">
            Update successful!
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Jarvest Reminder has been updated{version ? ` to v${version}` : ''}.
          </p>
        </div>
      </div>
    </NotificationShell>
  )
}
