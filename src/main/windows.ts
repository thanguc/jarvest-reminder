import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { NotificationView, TrayMenuState } from '../shared/types'
import { getAppIcon } from './icon'

const NOTIFICATION_MAX_WIDTH = 400
const NOTIFICATION_MAX_HEIGHT = 400
const SETTINGS_WIDTH = 480
const SETTINGS_HEIGHT = 560
const TRAY_MENU_MAIN_WIDTH = 220
const TRAY_MENU_SUBMENU_WIDTH = 160
const TRAY_MENU_GAP = 4
const TRAY_MENU_WIDTH = TRAY_MENU_MAIN_WIDTH + TRAY_MENU_GAP + TRAY_MENU_SUBMENU_WIDTH
const TRAY_MENU_HEIGHT = 320
const MARGIN = 16

let notificationWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let trayMenuWindow: BrowserWindow | null = null

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

export function showTrayMenu(trayBounds: Electron.Rectangle): void {
  if (trayMenuWindow && !trayMenuWindow.isDestroyed()) {
    trayMenuWindow.focus()
    return
  }

  // Use cursor position as the anchor point (matches native Windows context menu behavior)
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const workArea = display.workArea

  const trayRight = trayBounds.x + trayBounds.width
  const trayBottom = trayBounds.y + trayBounds.height

  const workAreaRight = workArea.x + workArea.width
  const workAreaBottom = workArea.y + workArea.height

  // Detect taskbar side from where the work area sits within the screen bounds
  const screenBounds = display.bounds
  const taskbarOnLeft = workArea.x > screenBounds.x
  const taskbarOnTop = workArea.y > screenBounds.y
  const taskbarOnRight = workAreaRight < screenBounds.x + screenBounds.width

  let x: number
  let y: number
  let submenuSide: 'left' | 'right'

  if (taskbarOnLeft) {
    // Menu opens to the right of the tray icon
    x = trayRight
    y = Math.max(workArea.y, Math.min(trayBottom - TRAY_MENU_HEIGHT, workAreaBottom - TRAY_MENU_HEIGHT))
    submenuSide = 'right'
  } else if (taskbarOnRight) {
    // Menu opens to the left of the tray icon
    x = trayBounds.x - TRAY_MENU_WIDTH
    y = Math.max(workArea.y, Math.min(trayBottom - TRAY_MENU_HEIGHT, workAreaBottom - TRAY_MENU_HEIGHT))
    submenuSide = 'left'
  } else {
    // Bottom (default) or top taskbar
    // Native Windows behavior: click point is the bottom-left corner of the menu.
    // Anchor the main panel's left edge at the tray icon's left edge.
    y = taskbarOnTop ? cursor.y : cursor.y - TRAY_MENU_HEIGHT

    // Prefer submenu to the right; fall back to left if it would clip the screen edge
    if (cursor.x + TRAY_MENU_WIDTH <= workAreaRight) {
      submenuSide = 'right'
      x = cursor.x
    } else {
      submenuSide = 'left'
      // Keep main panel left edge at cursor; submenu extends leftward
      x = cursor.x - TRAY_MENU_SUBMENU_WIDTH - TRAY_MENU_GAP
    }
    x = Math.max(workArea.x, Math.min(x, workAreaRight - TRAY_MENU_WIDTH))
  }

  trayMenuWindow = new BrowserWindow({
    width: TRAY_MENU_WIDTH,
    height: TRAY_MENU_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  trayMenuWindow.loadURL(getRendererUrl('tray-menu', { submenuSide }))

  trayMenuWindow.once('ready-to-show', () => {
    trayMenuWindow?.show()
  })

  trayMenuWindow.on('blur', () => {
    trayMenuWindow?.hide()
    trayMenuWindow?.destroy()
    trayMenuWindow = null
  })

  trayMenuWindow.on('closed', () => {
    trayMenuWindow = null
  })
}

export function hideTrayMenu(): void {
  if (trayMenuWindow && !trayMenuWindow.isDestroyed()) {
    trayMenuWindow.destroy()
    trayMenuWindow = null
  }
}

export function sendToTrayMenu(state: TrayMenuState): void {
  if (trayMenuWindow && !trayMenuWindow.isDestroyed()) {
    trayMenuWindow.webContents.send('tray-menu-state', state)
  }
}

export function isTrayMenuVisible(): boolean {
  return trayMenuWindow !== null && !trayMenuWindow.isDestroyed() && trayMenuWindow.isVisible()
}
