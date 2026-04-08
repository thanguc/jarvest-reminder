import { Tray, app, shell } from 'electron'
import { showSettings, showNotification, showTrayMenu, hideTrayMenu, sendToTrayMenu, isTrayMenuVisible } from './windows'
import { getTrayIcon, getTrayIconWithDot } from './icon'
import { isConfigured, getConfig } from './services/config'
import { isWithinWorkingHoursNow, isPastWorkEndTime, handleGoOnline } from './scheduler'
import { getRunningTimer, getDailyHours, stopTimer } from './services/harvest'
import { markEodSummaryShown } from './eod-state'
import { getBrowseUrl } from './services/jira'
import { isOfflineMode, getOfflineUntil } from './offline-state'
import { HarvestTimeEntry, TrayMenuState } from '../shared/types'

let tray: Tray | null = null
let lastRefreshTime = 0
const REFRESH_COOLDOWN_MS = 60 * 1000

// Kept across refreshes so the Stop Timer submenu action can use it
let currentRunningTimerId: number | null = null
let lastHoursText: string | null = null
let currentTrayMenuState: TrayMenuState | null = null

let blinkInterval: ReturnType<typeof setInterval> | null = null
let blinkVisible = true
let blinkColor: string | null = null

function startBlink(color: string): void {
  if (blinkInterval && blinkColor === color) return
  stopBlink()
  blinkColor = color
  blinkVisible = true
  tray?.setImage(getTrayIconWithDot(color))
  blinkInterval = setInterval(() => {
    if (!tray) return
    blinkVisible = !blinkVisible
    tray.setImage(blinkVisible ? getTrayIconWithDot(color) : getTrayIcon())
  }, 800)
}

function stopBlink(): void {
  if (blinkInterval) {
    clearInterval(blinkInterval)
    blinkInterval = null
  }
  blinkColor = null
  blinkVisible = true
  tray?.setImage(getTrayIcon())
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function extractTicketKey(entry: HarvestTimeEntry): string | null {
  if (entry.notes) {
    const match = entry.notes.match(/^([A-Z]+-\d+):/)
    if (match) return match[1]
  }
  return null
}

function buildRunningLabel(entry: HarvestTimeEntry): string {
  const key = extractTicketKey(entry)
  if (key) return `Running on ${key}`
  if (entry.notes) return `A manual timer is running (${entry.notes})`
  return 'A manual timer is running'
}

async function handleTrayStopTimer(entryId: number): Promise<void> {
  try {
    await stopTimer(entryId)
    currentRunningTimerId = null
    markEodSummaryShown()
    lastRefreshTime = 0 // bypass cooldown so tray reflects the change
    showNotification('eod-summary')
    doRefresh().catch(console.error)
  } catch (err) {
    console.error('[tray] stop timer failed:', err)
  }
}

export function handleTrayMenuAction(action: string): void {
  hideTrayMenu()
  switch (action) {
    case 'authorize':
      showSettings()
      break
    case 'go-online':
      handleGoOnline().catch(console.error)
      break
    case 'start-timer':
      showNotification('no-timer')
      break
    case 'stop-timer':
      if (currentRunningTimerId !== null) {
        handleTrayStopTimer(currentRunningTimerId)
      }
      break
    case 'browse-ticket': {
      const key = currentTrayMenuState?.ticketKey
      if (key) shell.openExternal(getBrowseUrl(key))
      break
    }
    case 'go-offline':
      showNotification('offline-confirm')
      break
    case 'go-to-harvest': {
      const baseUrl = getConfig().harvest.baseUrl || 'https://app.harvestapp.com'
      shell.openExternal(`${baseUrl}/time`)
      break
    }
    case 'settings':
      showSettings()
      break
    case 'quit':
      app.quit()
      break
  }
}

export function getTrayMenuState(): TrayMenuState | null {
  return currentTrayMenuState
}

function applyTrayState(
  statusText: string,
  hoursText: string | null,
  state: 'checking' | 'not-authorized' | 'idle' | 'running' | 'offline',
  ticketKey: string | null = null
): void {
  if (!tray) return

  const tooltip = hoursText
    ? `Jarvest Reminder\n${statusText}\n${hoursText}`
    : `Jarvest Reminder\n${statusText}`
  tray.setToolTip(tooltip)

  const inWorkingHours = isWithinWorkingHoursNow()
  const isWarning = state !== 'offline' && (
    (state === 'idle' && inWorkingHours)
    || (state === 'running' && !inWorkingHours && isPastWorkEndTime())
  )

  const dotColor = state === 'not-authorized' || state === 'offline' ? '#C0C0C0'
    : isWarning ? '#FF0000'
    : state === 'running' ? '#F27A20'
    : inWorkingHours ? '#FFD700' : '#1558BC'

  if (state === 'running' || isWarning) {
    startBlink(dotColor)
  } else {
    stopBlink()
    if (state !== 'checking') {
      tray.setImage(getTrayIconWithDot(dotColor))
    }
  }

  // Update stored state and push live update to open menu window
  currentTrayMenuState = {
    statusText,
    hoursText,
    state,
    dotColor: state === 'checking' ? null : dotColor,
    ticketKey,
    harvestBaseUrl: getConfig().harvest.baseUrl || 'https://app.harvestapp.com'
  }
  if (isTrayMenuVisible()) {
    sendToTrayMenu(currentTrayMenuState)
  }
}

async function doRefresh(): Promise<void> {
  if (Date.now() - lastRefreshTime < REFRESH_COOLDOWN_MS) return
  lastRefreshTime = Date.now()
  if (!isConfigured()) {
    currentRunningTimerId = null
    applyTrayState('Idle (not authorized)', null, 'not-authorized')
    return
  }

  if (isOfflineMode()) {
    currentRunningTimerId = null
    const until = getOfflineUntil()
    const statusText = until === 'today' ? 'Offline (today only)' : 'Offline (until go online)'
    try {
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const [runningTimer, dailyHours] = await Promise.all([getRunningTimer(), getDailyHours(today)])
      if (runningTimer) {
        console.log('[tray] offline mode — running timer detected on refresh, going online')
        handleGoOnline('timer-detected').catch(console.error)
        return
      }
      lastHoursText = `${formatHours(dailyHours)} spent today`
      applyTrayState(statusText, lastHoursText, 'offline')
    } catch {
      applyTrayState(statusText, lastHoursText, 'offline')
    }
    return
  }
  try {
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const [runningTimer, dailyHours] = await Promise.all([
      getRunningTimer(),
      getDailyHours(today)
    ])
    lastHoursText = `${formatHours(dailyHours)} spent today`
    if (runningTimer) {
      currentRunningTimerId = runningTimer.id
      const ticketKey = extractTicketKey(runningTimer)
      applyTrayState(buildRunningLabel(runningTimer), lastHoursText, 'running', ticketKey)
    } else {
      currentRunningTimerId = null
      applyTrayState('Idle', lastHoursText, 'idle')
    }
  } catch {
    // silently ignore — keep existing status
  }
}

/** Refreshes tray status — respects 60s cooldown regardless of trigger source. */
export async function refreshTrayStatus(): Promise<void> {
  await doRefresh()
}

/** Force-refreshes tray status, bypassing the refresh interval. Use after explicit user actions. */
export async function forceRefreshTrayStatus(): Promise<void> {
  lastRefreshTime = 0
  await doRefresh()
}

function triggerBackgroundRefresh(): void {
  doRefresh().catch(console.error)
}

export function createTray(): Tray {
  tray = new Tray(getTrayIcon())
  applyTrayState('Idle (checking...)', null, 'checking')
  refreshTrayStatus().catch(console.error)
  tray.on('double-click', () => showSettings())
  tray.on('mouse-enter', () => triggerBackgroundRefresh())
  tray.on('right-click', () => {
    triggerBackgroundRefresh()
    if (!tray) return
    if (isTrayMenuVisible()) {
      hideTrayMenu()
    } else {
      showTrayMenu(tray.getBounds())
    }
  })
  return tray
}

export function destroyTray(): void {
  stopBlink()
  hideTrayMenu()
  if (tray) {
    tray.destroy()
    tray = null
  }
}
