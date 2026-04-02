import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc-handlers'
import { startScheduler, stopScheduler } from './scheduler'
import { isConfigured } from './services/config'
import { showSettings } from './windows'

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.jarvest.reminder')

  // Hide dock icon on macOS (tray-only app)
  if (process.platform === 'darwin') {
    app.dock.hide()
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createTray()

  // If not configured, show settings on first run
  if (!isConfigured()) {
    showSettings()
  }

  startScheduler()
})

app.on('window-all-closed', () => {
  // Don't quit when all windows close — we're a tray app
})

app.on('before-quit', () => {
  stopScheduler()
})
