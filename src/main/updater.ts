import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { UpdateInfo, UpdateStatus } from '../shared/types'
import {
  getAvailableUpdateVersion,
  setAvailableUpdateVersion,
  getPreviousVersion,
  setPreviousVersion
} from './services/config'
import { showNotification, showSettings } from './windows'

let status: UpdateStatus = 'idle'
let downloadProgress = 0
let errorMessage: string | null = null
let availableVersion: string | null = null
let dailyCheckTimeout: ReturnType<typeof setTimeout> | null = null

/** Broadcast current update info to all renderer windows. */
function broadcast(): void {
  const info = getUpdateInfo()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('update-status-changed', info)
    }
  }
}

function setStatus(newStatus: UpdateStatus): void {
  status = newStatus
  broadcast()
}

export function getUpdateInfo(): UpdateInfo {
  return {
    status,
    currentVersion: app.getVersion(),
    availableVersion: availableVersion ?? getAvailableUpdateVersion(),
    downloadProgress: downloadProgress,
    error: errorMessage
  }
}

/** Trigger an update check (called from settings page). */
export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch(console.error)
}

/** Save current version as previousVersion, then quit-and-install. */
export function installUpdate(): void {
  setPreviousVersion(app.getVersion())
  setAvailableUpdateVersion(null)
  autoUpdater.quitAndInstall()
}

/** Open settings and trigger the update flow from there. */
export function openSettingsAndUpdate(): void {
  showSettings()
  // Small delay so the settings window is ready to receive status events
  setTimeout(() => checkForUpdates(), 500)
}

/**
 * Check if this is the first launch after a successful update.
 * If so, show a success notification and clear the stored previousVersion.
 */
export function checkPostUpdateSuccess(): void {
  const prev = getPreviousVersion()
  if (!prev) return
  const current = app.getVersion()
  if (prev !== current) {
    setPreviousVersion(null)
    setAvailableUpdateVersion(null)
    // Show the success notification after a short delay so the app is fully ready
    setTimeout(() => showNotification('update-success'), 2000)
  } else {
    // Same version — clear stale marker (e.g. user cancelled restart)
    setPreviousVersion(null)
  }
}

/** Schedule the next silent check at 8:00 AM. */
function scheduleDailyCheck(): void {
  if (dailyCheckTimeout) clearTimeout(dailyCheckTimeout)
  const now = new Date()
  const next8AM = new Date(now)
  next8AM.setHours(8, 0, 0, 0)
  if (next8AM.getTime() <= now.getTime()) {
    next8AM.setDate(next8AM.getDate() + 1)
  }
  const ms = next8AM.getTime() - now.getTime()
  dailyCheckTimeout = setTimeout(() => {
    console.log('[updater] daily 8AM silent check')
    autoUpdater.checkForUpdates().catch(console.error)
    scheduleDailyCheck() // schedule the next one
  }, ms)
}

export function initUpdater(): void {
  if (!app.isPackaged) return

  // Restore persisted available version into memory
  availableVersion = getAvailableUpdateVersion()

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    errorMessage = null
    downloadProgress = 0
    setStatus('checking')
  })

  autoUpdater.on('update-available', (info) => {
    availableVersion = info.version
    setAvailableUpdateVersion(info.version)
    setStatus('downloading')
  })

  autoUpdater.on('download-progress', (progress) => {
    downloadProgress = Math.round(progress.percent)
    setStatus('downloading')
  })

  autoUpdater.on('update-not-available', () => {
    setStatus('idle')
  })

  autoUpdater.on('update-downloaded', (info) => {
    availableVersion = info.version
    setAvailableUpdateVersion(info.version)
    setStatus('ready')

    // If no settings window is open, show the update-available notification
    const hasSettingsOpen = BrowserWindow.getAllWindows().some((win) => {
      if (win.isDestroyed()) return false
      const url = win.webContents.getURL()
      return url.includes('view=settings')
    })
    if (!hasSettingsOpen) {
      showNotification('update-available')
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
    errorMessage = err.message || 'Update check failed'
    setStatus('error')
  })

  // Initial silent check after 5s
  setTimeout(() => autoUpdater.checkForUpdates().catch(console.error), 5000)

  // Schedule daily 8AM check
  scheduleDailyCheck()
}
