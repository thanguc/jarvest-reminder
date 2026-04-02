import { Tray, Menu, MenuItemConstructorOptions, app } from 'electron'
import { showSettings, showNotification } from './windows'
import { getTrayIcon } from './icon'
import { isConfigured } from './services/config'
import { getRunningTimer, getDailyHours, stopTimer } from './services/harvest'
import { markEodSummaryShown } from './eod-state'
import { HarvestTimeEntry } from '../shared/types'

let tray: Tray | null = null
let lastRefreshTime = 0
const REFRESH_COOLDOWN_MS = 60 * 1000

// Kept across refreshes so the Stop Timer submenu action can use it
let currentRunningTimerId: number | null = null

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function extractTicketKey(entry: HarvestTimeEntry): string {
  if (entry.notes) {
    const match = entry.notes.match(/^([A-Z]+-\d+):/)
    if (match) return match[1]
  }
  return 'unknown'
}

function buildStatusSubmenu(
  state: 'not-authorized' | 'idle' | 'running'
): MenuItemConstructorOptions[] {
  if (state === 'not-authorized') {
    return [{ label: 'Authorize', click: () => showSettings() }]
  }
  if (state === 'idle') {
    return [{ label: 'Start Timer', click: () => showNotification('no-timer') }]
  }
  return [{
    label: 'Stop Timer',
    click: () => {
      if (currentRunningTimerId !== null) {
        handleTrayStopTimer(currentRunningTimerId)
      }
    }
  }]
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

function applyTrayState(
  statusText: string,
  state: 'checking' | 'not-authorized' | 'idle' | 'running'
): void {
  if (!tray) return

  tray.setToolTip(`Jarvest Reminder\n${statusText}`)

  const statusItem: MenuItemConstructorOptions = state === 'checking'
    ? { label: statusText, enabled: false }
    : { label: statusText, submenu: buildStatusSubmenu(state) }

  const contextMenu = Menu.buildFromTemplate([
    statusItem,
    { type: 'separator' },
    { label: 'Settings', click: () => showSettings() },
    { label: 'Quit', click: () => app.quit() }
  ])
  tray.setContextMenu(contextMenu)
}

async function doRefresh(): Promise<void> {
  if (Date.now() - lastRefreshTime < REFRESH_COOLDOWN_MS) return
  lastRefreshTime = Date.now()
  if (!isConfigured()) {
    currentRunningTimerId = null
    applyTrayState('Idle (not authorized)', 'not-authorized')
    return
  }
  try {
    const today = new Date().toISOString().split('T')[0]
    const [runningTimer, dailyHours] = await Promise.all([
      getRunningTimer(),
      getDailyHours(today)
    ])
    const hoursText = formatHours(dailyHours)
    if (runningTimer) {
      currentRunningTimerId = runningTimer.id
      const ticketKey = extractTicketKey(runningTimer)
      applyTrayState(`Running on ${ticketKey} (${hoursText} spent today)`, 'running')
    } else {
      currentRunningTimerId = null
      applyTrayState(`Idle (${hoursText} spent today)`, 'idle')
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
  applyTrayState('Idle (checking...)', 'checking')
  refreshTrayStatus().catch(console.error)
  tray.on('double-click', () => showSettings())
  tray.on('mouse-enter', () => triggerBackgroundRefresh())
  tray.on('right-click', () => triggerBackgroundRefresh())
  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
