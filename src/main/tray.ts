import { Tray, Menu, app } from 'electron'
import { showSettings } from './windows'
import { getTrayIcon } from './icon'

let tray: Tray | null = null

export function createTray(): Tray {
  tray = new Tray(getTrayIcon())
  tray.setToolTip('Jarvest Reminder')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Settings',
      click: () => showSettings()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => showSettings())
  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
