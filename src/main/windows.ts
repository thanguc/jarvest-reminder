import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { NotificationView } from '../shared/types'

const NOTIFICATION_WIDTH = 400
const NOTIFICATION_HEIGHT = 280
const SETTINGS_WIDTH = 500
const SETTINGS_HEIGHT = 580
const MARGIN = 16

let notificationWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

function getRendererUrl(view: NotificationView): string {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return `${process.env['ELECTRON_RENDERER_URL']}?view=${view}`
  }
  return `file://${join(__dirname, '../renderer/index.html')}?view=${view}`
}

export function showNotification(view: NotificationView): void {
  // Close existing notification
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.close()
    notificationWindow = null
  }

  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  const winHeight = view === 'settings' ? SETTINGS_HEIGHT : NOTIFICATION_HEIGHT
  const winWidth = view === 'settings' ? SETTINGS_WIDTH : NOTIFICATION_WIDTH

  notificationWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - MARGIN,
    y: height - winHeight - MARGIN,
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

  notificationWindow.loadURL(getRendererUrl(view))

  notificationWindow.once('ready-to-show', () => {
    notificationWindow?.show()
  })

  notificationWindow.on('closed', () => {
    notificationWindow = null
  })
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
    x: Math.round(screenWidth / 2 - SETTINGS_WIDTH / 2),
    y: Math.round(screenHeight / 2 - SETTINGS_HEIGHT / 2),
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

export function isNotificationVisible(): boolean {
  return notificationWindow !== null && !notificationWindow.isDestroyed()
}
