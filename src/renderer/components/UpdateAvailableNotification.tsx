import { useState, useEffect } from 'react'
import NotificationShell from './NotificationShell'

export default function UpdateAvailableNotification(): JSX.Element {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    window.jarvest.getUpdateInfo().then((info) => {
      setVersion(info.availableVersion || '')
    })
  }, [])

  const handleDismiss = (): void => {
    window.jarvest.dismiss()
  }

  const handleUpdate = (): void => {
    window.jarvest.dismiss()
    window.jarvest.openSettings()
  }

  return (
    <NotificationShell
      title="Update Available"
      actions={
        <>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleUpdate}
            className="px-4 py-1.5 text-sm bg-[#1558BC] text-white rounded-md hover:bg-[#0f4a9e] transition-colors font-medium"
          >
            Update
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#1558BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">
            A new version is available
          </p>
          {version && (
            <p className="text-xs text-gray-500 mt-1">
              Version {version} is ready to install.
            </p>
          )}
        </div>
      </div>
    </NotificationShell>
  )
}
