import { app, BrowserWindow, powerMonitor } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc-handlers'
import { startScheduler, stopScheduler, restartScheduler } from './scheduler'
import { getConfig, isConfigured } from './services/config'
import { showSettings } from './windows'
import { initUpdater, checkPostUpdateSuccess } from './updater'

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
  initUpdater()
  checkPostUpdateSuccess()

  // Apply startup setting from saved config
  const config = getConfig()
  app.setLoginItemSettings({ openAtLogin: config.runOnStartup })

  // If not configured, show settings on first run
  if (!isConfigured()) {
    showSettings()
  }

  startScheduler()

  // Re-align timers after sleep/hibernation since setTimeout/setInterval freeze during sleep
  powerMonitor.on('resume', () => {
    console.log('[power] system resumed from sleep — restarting scheduler')
    restartScheduler()
  })

  // Trigger an immediate check when the user unlocks the screen
  powerMonitor.on('unlock-screen', () => {
    console.log('[power] screen unlocked — restarting scheduler')
    restartScheduler()
  })
})

app.on('window-all-closed', () => {
  // Don't quit when all windows close — we're a tray app
})

app.on('before-quit', () => {
  stopScheduler()
})
