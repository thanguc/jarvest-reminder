import { useEffect, useRef, useState } from 'react'
import { TrayMenuState } from '../../shared/types'

const MENU_MAIN_WIDTH = 220
const MENU_SUBMENU_WIDTH = 160
const MENU_GAP = 4

function buildSubmenuItems(state: TrayMenuState): { label: string; action: string }[] {
  const { state: s, ticketKey } = state
  const items: { label: string; action: string }[] = []
  if (s === 'not-authorized') {
    items.push({ label: 'Authorize', action: 'authorize' })
  } else if (s === 'offline') {
    items.push({ label: 'Go Online', action: 'go-online' })
  } else if (s === 'idle') {
    items.push({ label: 'Start Timer', action: 'start-timer' })
    items.push({ label: 'Go Offline', action: 'go-offline' })
  } else if (s === 'running') {
    if (ticketKey) items.push({ label: `Browse ${ticketKey}`, action: 'browse-ticket' })
    items.push({ label: 'Stop Timer', action: 'stop-timer' })
    items.push({ label: 'Go Offline', action: 'go-offline' })
  }
  return items
}

function getSubmenuSide(): 'left' | 'right' {
  const params = new URLSearchParams(window.location.search)
  return params.get('submenuSide') === 'right' ? 'right' : 'left'
}

export default function TrayMenu(): JSX.Element {
  const [state, setState] = useState<TrayMenuState | null>(null)
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const [submenuTop, setSubmenuTop] = useState(0)
  const statusRowRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submenuSide = getSubmenuSide()

  useEffect(() => {
    window.jarvest.getTrayMenuState().then(setState)
    const unsub = window.jarvest.onTrayMenuStateChanged(setState)
    return unsub
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (submenuOpen) setSubmenuOpen(false)
        else window.jarvest.closeTrayMenu()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submenuOpen])

  const act = (action: string): void => {
    window.jarvest.trayMenuAction(action)
  }

  const scheduleHide = (): void => {
    hideTimerRef.current = setTimeout(() => setSubmenuOpen(false), 120)
  }

  const cancelHide = (): void => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
  }

  const openSubmenu = (): void => {
    cancelHide()
    if (statusRowRef.current) {
      const rect = statusRowRef.current.getBoundingClientRect()
      setSubmenuTop(rect.top)
    }
    setSubmenuOpen(true)
  }

  if (!state) return <div className="h-screen" />

  const { statusText, hoursText } = state
  const s = state.state
  const isAuthorized = s !== 'not-authorized' && s !== 'checking'
  const submenuItems = buildSubmenuItems(state)
  const hasSubmenu = submenuItems.length > 0

  // Submenu absolute position: aligned with status row top, offset to chosen side
  const submenuStyle: React.CSSProperties =
    submenuSide === 'right'
      ? { left: MENU_MAIN_WIDTH + MENU_GAP, top: submenuTop }
      : { right: MENU_MAIN_WIDTH + MENU_GAP, top: submenuTop }

  // Main menu panel alignment: if submenu is to the left, main panel is on the right (ml-auto);
  // if submenu is to the right, main panel is on the left (mr-auto)
  const mainPanelClass = submenuSide === 'right' ? 'mr-auto' : 'ml-auto'

  return (
    <div className="h-screen relative flex flex-col justify-end pb-1">
      {/* Submenu panel */}
      {submenuOpen && hasSubmenu && (
        <div
          className="absolute bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.25)] border border-black/[0.08] py-1 overflow-hidden"
          style={{ ...submenuStyle, width: MENU_SUBMENU_WIDTH }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        >
          {submenuItems.map((item) => (
            <button
              key={item.action}
              className="w-full text-left px-3 py-[5px] text-[13px] text-gray-800 hover:bg-gray-100 active:bg-gray-200 cursor-default leading-5 whitespace-nowrap"
              onClick={() => act(item.action)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Main menu panel */}
      <div
        className={`bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.25)] border border-black/[0.08] py-1 overflow-hidden select-none ${mainPanelClass}`}
        style={{ width: MENU_MAIN_WIDTH }}
      >
        {/* Status row — cascade trigger */}
        <div
          ref={statusRowRef}
          className={`px-3 pt-1 pb-0.5 cursor-default ${hasSubmenu ? 'hover:bg-gray-100' : ''} ${submenuOpen ? 'bg-gray-100' : ''}`}
          onMouseEnter={() => { if (hasSubmenu) openSubmenu() }}
          onMouseLeave={() => { if (hasSubmenu) scheduleHide() }}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="text-[12px] font-medium text-gray-700 leading-5 truncate flex-1">{statusText}</div>
            {hasSubmenu && (
              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
          {hoursText && (
            <div className="text-[11px] text-gray-400 leading-4 pb-0.5">{hoursText}</div>
          )}
        </div>

        <Separator />

        {isAuthorized && s !== 'offline' && (
          <Item label="Go to Harvest" onClick={() => act('go-to-harvest')} onHover={() => { cancelHide(); setSubmenuOpen(false) }} />
        )}
        <Item label="Settings" onClick={() => act('settings')} onHover={() => { cancelHide(); setSubmenuOpen(false) }} />
        <Item label="Quit" onClick={() => act('quit')} onHover={() => { cancelHide(); setSubmenuOpen(false) }} />
      </div>
    </div>
  )
}

function Item({ label, onClick, onHover }: { label: string; onClick: () => void; onHover?: () => void }): JSX.Element {
  return (
    <button
      className="w-full text-left px-3 py-[5px] text-[13px] text-gray-800 hover:bg-gray-100 active:bg-gray-200 cursor-default leading-5"
      onClick={onClick}
      onMouseEnter={onHover}
    >
      {label}
    </button>
  )
}

function Separator(): JSX.Element {
  return <div className="my-1 h-px bg-black/[0.07]" />
}
