import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { NotificationView } from '../shared/types'
import { getAppIcon } from './icon'

const NOTIFICATION_MAX_WIDTH = 400
const NOTIFICATION_MAX_HEIGHT = 400
const SETTINGS_WIDTH = 480
const SETTINGS_HEIGHT = 560
const MARGIN = 16

let notificationWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

function getRendererUrl(view: NotificationView, params?: Record<string, string>): string {
  const search = new URLSearchParams({ view, ...params }).toString()
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return `${process.env['ELECTRON_RENDERER_URL']}?${search}`
  }
  return `file://${join(__dirname, '../renderer/index.html')}?${search}`
}

function createNotificationWindow(view: NotificationView, params?: Record<string, string>): void {
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  const win = new BrowserWindow({
    width: NOTIFICATION_MAX_WIDTH,
    height: 1,
    x: width - NOTIFICATION_MAX_WIDTH - MARGIN,
    y: height - 1 - MARGIN,
    icon: getAppIcon(),
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    transparent: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  notificationWindow = win

  win.loadURL(getRendererUrl(view, params))

  // Fallback: show at max height if resize IPC never fires
  win.once('ready-to-show', () => {
    setTimeout(() => {
      if (!win.isDestroyed() && !win.isVisible()) {
        resizeNotificationWindow(NOTIFICATION_MAX_HEIGHT)
      }
    }, 500)
  })

  win.on('closed', () => {
    if (notificationWindow === win) {
      notificationWindow = null
    }
  })
}

export function resizeNotificationWindow(contentHeight: number): void {
  if (!notificationWindow || notificationWindow.isDestroyed()) return
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = display.workAreaSize
  const clampedHeight = Math.min(Math.max(contentHeight, 60), NOTIFICATION_MAX_HEIGHT)
  notificationWindow.setBounds({
    x: screenWidth - NOTIFICATION_MAX_WIDTH - MARGIN,
    y: screenHeight - clampedHeight - MARGIN,
    width: NOTIFICATION_MAX_WIDTH,
    height: clampedHeight
  })
  if (!notificationWindow.isVisible()) {
    notificationWindow.show()
  }
}

export function showNotification(view: NotificationView, params?: Record<string, string>): void {
  // Force-destroy all existing notification windows before showing a new one
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== settingsWindow && !win.isDestroyed()) {
      win.destroy()
    }
  })
  notificationWindow = null
  createNotificationWindow(view, params)
}

export function showSettings(tab?: string): void {
  // Close notification if open
  closeNotification()

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = display.workAreaSize

  settingsWindow = new BrowserWindow({
    width: SETTINGS_WIDTH,
    height: SETTINGS_HEIGHT,
    x: screenWidth - SETTINGS_WIDTH - MARGIN,
    y: screenHeight - SETTINGS_HEIGHT - MARGIN,
    icon: getAppIcon(),
    frame: false,
    resizable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  const url = getRendererUrl('settings') + (tab ? `&tab=${tab}` : '')
  settingsWindow.loadURL(url)

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

export function closeNotification(): void {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.close()
    notificationWindow = null
  }
}

export function closeSettings(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close()
    settingsWindow = null
  }
}

export function isNotificationVisible(): boolean {
  return notificationWindow !== null && !notificationWindow.isDestroyed()
}
