import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import { showSettings } from './windows'

let tray: Tray | null = null

function createTrayIcon(): nativeImage {
  // Create a simple 16x16 icon programmatically with brand gradient colors
  const size = 16
  const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F27A20"/>
          <stop offset="100%" stop-color="#1558BC"/>
        </linearGradient>
      </defs>
      <circle cx="8" cy="8" r="7" fill="url(#g)" stroke="#0f4a9e" stroke-width="1"/>
      <line x1="8" y1="4" x2="8" y2="8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="8" y1="8" x2="11" y2="10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `.trim()

  return nativeImage.createFromBuffer(
    Buffer.from(canvas),
    { width: size, height: size }
  )
}

export function createTray(): Tray {
  // Try to load icon from resources, fall back to programmatic icon
  let icon: nativeImage
  try {
    const iconPath = join(__dirname, '../../resources/icon.png')
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) throw new Error('empty')
  } catch {
    icon = createTrayIcon()
  }

  tray = new Tray(icon)
  tray.setToolTip('Jarvest Timer')

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
  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
