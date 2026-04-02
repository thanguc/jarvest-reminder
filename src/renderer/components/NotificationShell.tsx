import React from 'react'

interface NotificationShellProps {
  title: string
  children: React.ReactNode
  actions: React.ReactNode
}

export default function NotificationShell({
  title,
  children,
  actions
}: NotificationShellProps): JSX.Element {
  const handleSettings = (): void => {
    window.jarvest.openSettings()
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        <button
          onClick={handleSettings}
          className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-3 overflow-auto">
        {children}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        {actions}
      </div>
    </div>
  )
}
