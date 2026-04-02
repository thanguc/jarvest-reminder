import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { NotificationView } from '../shared/types'
import { getAppIcon } from './icon'

const NOTIFICATION_WIDTH = 400
const NOTIFICATION_HEIGHT = 280
const SETTINGS_WIDTH = 480
const SETTINGS_HEIGHT = 640
const MARGIN = 16

let notificationWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

function getRendererUrl(view: NotificationView): string {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return `${process.env['ELECTRON_RENDERER_URL']}?view=${view}`
  }
  return `file://${join(__dirname, '../renderer/index.html')}?view=${view}`
}

function createNotificationWindow(view: NotificationView): void {
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  const winHeight = view === 'settings' ? SETTINGS_HEIGHT : NOTIFICATION_HEIGHT
  const winWidth = view === 'settings' ? SETTINGS_WIDTH : NOTIFICATION_WIDTH

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - MARGIN,
    y: height - winHeight - MARGIN,
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

  win.loadURL(getRendererUrl(view))

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('closed', () => {
    if (notificationWindow === win) {
      notificationWindow = null
    }
  })
}

export function showNotification(view: NotificationView): void {
  // Force-destroy all existing notification windows before showing a new one
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== settingsWindow && !win.isDestroyed()) {
      win.destroy()
    }
  })
  notificationWindow = null
  createNotificationWindow(view)
}

export function showSettings(): void {
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

  settingsWindow.loadURL(getRendererUrl('settings'))

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
