import React, { useRef, useEffect } from 'react'
import Logo from './Logo'

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
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      window.jarvest.resizeNotification(el.offsetHeight)
    })
    observer.observe(el)
    window.jarvest.resizeNotification(el.offsetHeight)
    return () => observer.disconnect()
  }, [])

  const handleSettings = (): void => {
    window.jarvest.openSettings()
  }

  return (
    <div ref={shellRef} className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#F27A20] to-[#1558BC]">
        <div className="flex items-center gap-2">
          <Logo size={20} />
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
      <div className="px-4 py-3 border-x border-gray-100">
        {children}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100">
        {actions}
      </div>
    </div>
  )
}
