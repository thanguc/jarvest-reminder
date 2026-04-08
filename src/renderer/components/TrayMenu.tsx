import { useEffect, useRef, useState } from 'react'
import { TrayMenuState } from '../../shared/types'

const MENU_MAIN_WIDTH = 220
const MENU_SUBMENU_WIDTH = 160
const MENU_GAP = 0
const SHADOW_BLEED = 20

type ActiveSubmenu = 'status' | 'more' | null

function buildStatusSubmenuItems(state: TrayMenuState): { label: string; action: string }[] {
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

function buildMoreSubmenuItems(): { label: string; action: string; disabled?: boolean }[] {
  return [
    { label: 'Go to Harvest', action: 'go-to-harvest' },
    { label: 'Log daily scrum entry', action: 'log-daily-scrum' },
    { label: 'Submit timesheet', action: 'submit-timesheet', disabled: true }
  ]
}

function getSubmenuSide(): 'left' | 'right' {
  const params = new URLSearchParams(window.location.search)
  return params.get('submenuSide') === 'right' ? 'right' : 'left'
}

export default function TrayMenu(): JSX.Element {
  const [state, setState] = useState<TrayMenuState | null>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<ActiveSubmenu>(null)
  const [submenuTop, setSubmenuTop] = useState(0)
  const statusRowRef = useRef<HTMLDivElement>(null)
  const moreRowRef = useRef<HTMLButtonElement>(null)
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
        if (activeSubmenu) setActiveSubmenu(null)
        else window.jarvest.closeTrayMenu()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeSubmenu])

  const act = (action: string): void => {
    window.jarvest.trayMenuAction(action)
  }

  const scheduleHide = (): void => {
    hideTimerRef.current = setTimeout(() => setActiveSubmenu(null), 120)
  }

  const cancelHide = (): void => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
  }

  const openSubmenu = (which: ActiveSubmenu, ref: React.RefObject<HTMLElement>): void => {
    cancelHide()
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setSubmenuTop(rect.top)
    }
    setActiveSubmenu(which)
  }

  const closeOtherSubmenus = (): void => {
    cancelHide()
    setActiveSubmenu(null)
  }

  if (!state) return <div className="h-screen" />

  const { statusText, hoursText, dotColor } = state
  const s = state.state
  const isAuthorized = s !== 'not-authorized' && s !== 'checking'
  const statusSubmenuItems = buildStatusSubmenuItems(state)
  const moreSubmenuItems = buildMoreSubmenuItems()
  const hasStatusSubmenu = statusSubmenuItems.length > 0
  const showMore = isAuthorized && s !== 'offline'

  const currentSubmenuItems =
    activeSubmenu === 'status' ? statusSubmenuItems :
    activeSubmenu === 'more' ? moreSubmenuItems : []

  // Submenu absolute position: aligned with trigger row top, offset to chosen side
  const submenuStyle: React.CSSProperties =
    submenuSide === 'right'
      ? { left: SHADOW_BLEED + MENU_MAIN_WIDTH + MENU_GAP, top: submenuTop }
      : { right: SHADOW_BLEED + MENU_MAIN_WIDTH + MENU_GAP, top: submenuTop }

  // Main menu panel alignment
  const mainPanelClass = submenuSide === 'right' ? 'mr-auto' : 'ml-auto'

  return (
    <div className="h-screen relative flex flex-col justify-end pb-1 px-5">
      {/* Submenu panel */}
      {activeSubmenu !== null && currentSubmenuItems.length > 0 && (
        <div
          className="absolute bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.25)] border border-black/[0.08] py-1 overflow-hidden"
          style={{ ...submenuStyle, width: MENU_SUBMENU_WIDTH }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        >
          {currentSubmenuItems.map((item) => (
            <button
              key={item.action}
              disabled={'disabled' in item && item.disabled}
              className="w-full text-left px-3 py-[5px] text-[13px] text-gray-800 hover:bg-gray-100 active:bg-gray-200 cursor-default leading-5 whitespace-nowrap disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              onClick={() => !('disabled' in item && item.disabled) && act(item.action)}
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
          className={`px-3 pt-1 pb-0.5 cursor-default ${hasStatusSubmenu ? 'hover:bg-gray-100' : ''} ${activeSubmenu === 'status' ? 'bg-gray-100' : ''}`}
          onMouseEnter={() => { if (hasStatusSubmenu) openSubmenu('status', statusRowRef) }}
          onMouseLeave={() => { if (hasStatusSubmenu) scheduleHide() }}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {dotColor && (
                <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
              )}
              <div className="text-[12px] font-medium text-gray-700 leading-5 truncate">{statusText}</div>
            </div>
            {hasStatusSubmenu && (
              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
          {hoursText && (
            <div className="text-[11px] text-gray-400 leading-4 pb-0.5 pl-[14px]">{hoursText}</div>
          )}
        </div>

        <Separator />

        {showMore && (
          <button
            ref={moreRowRef}
            className={`w-full text-left px-3 pl-[26px] py-[5px] text-[13px] text-gray-800 hover:bg-gray-100 active:bg-gray-200 cursor-default leading-5 flex items-center justify-between ${activeSubmenu === 'more' ? 'bg-gray-100' : ''}`}
            onMouseEnter={() => openSubmenu('more', moreRowRef)}
            onMouseLeave={scheduleHide}
          >
            <span>More</span>
            <svg className="w-3 h-3 text-gray-400 flex-shrink-0 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <Item label="Settings" onClick={() => act('settings')} onHover={closeOtherSubmenus} />
        <Item label="Quit" onClick={() => act('quit')} onHover={closeOtherSubmenus} />
      </div>
    </div>
  )
}

function Item({ label, onClick, onHover }: { label: string; onClick: () => void; onHover?: () => void }): JSX.Element {
  return (
    <button
      className="w-full text-left px-3 pl-[26px] py-[5px] text-[13px] text-gray-800 hover:bg-gray-100 active:bg-gray-200 cursor-default leading-5"
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
