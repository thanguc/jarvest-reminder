import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error'

let status: UpdateStatus = 'idle'
let statusChangeCallback: (() => void) | null = null

export function getUpdateStatus(): UpdateStatus {
  return status
}

export function onUpdateStatusChange(cb: () => void): void {
  statusChangeCallback = cb
}

function setStatus(newStatus: UpdateStatus): void {
  status = newStatus
  statusChangeCallback?.()
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch(console.error)
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}

export function initUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => setStatus('checking'))
  autoUpdater.on('update-available', () => setStatus('downloading'))
  autoUpdater.on('download-progress', () => setStatus('downloading'))
  autoUpdater.on('update-not-available', () => setStatus('idle'))
  autoUpdater.on('update-downloaded', () => setStatus('ready'))
  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
    setStatus('error')
    setTimeout(() => setStatus('idle'), 5000)
  })

  // Delay initial check so app finishes initializing first
  setTimeout(() => checkForUpdates(), 5000)
}
