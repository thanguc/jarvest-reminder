import { nativeImage, app } from 'electron'
import { readFileSync } from 'fs'
import { join } from 'path'

function getIconPath(): string {
  if (app.isPackaged) {
    // extraResources places files relative to the app's resource directory
    return join(process.resourcesPath, 'resources', 'icon.png')
  }
  // In dev, resources/ is at the project root
  return join(app.getAppPath(), 'resources', 'icon.png')
}

let _iconBuffer: Buffer | null = null

function getIconBuffer(): Buffer {
  if (!_iconBuffer) {
    _iconBuffer = readFileSync(getIconPath())
  }
  return _iconBuffer
}

let _trayIcon: Electron.NativeImage | null = null
let _appIcon: Electron.NativeImage | null = null
const _trayDotCache = new Map<string, Electron.NativeImage>()

const TRAY_SIZE = 32

export function getTrayIcon(): Electron.NativeImage {
  if (!_trayIcon) {
    const img = nativeImage.createFromBuffer(getIconBuffer())
    _trayIcon = img.resize({ width: TRAY_SIZE, height: TRAY_SIZE })
  }
  return _trayIcon
}

/** Returns the tray icon with a colored dot in the bottom-right corner. */
export function getTrayIconWithDot(hex: string): Electron.NativeImage {
  const cached = _trayDotCache.get(hex)
  if (cached) return cached

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const base = getTrayIcon()
  const bitmap = Buffer.from(base.toBitmap())

  const radius = 5
  const cx = TRAY_SIZE - radius - 1
  const cy = TRAY_SIZE - radius - 1
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) {
        const off = (y * TRAY_SIZE + x) * 4
        bitmap[off] = b
        bitmap[off + 1] = g
        bitmap[off + 2] = r
        bitmap[off + 3] = 0xff
      }
    }
  }

  const img = nativeImage.createFromBitmap(bitmap, { width: TRAY_SIZE, height: TRAY_SIZE })
  _trayDotCache.set(hex, img)
  return img
}

const DOT_SIZE = 12
const _dotCache = new Map<string, Electron.NativeImage>()

/** Creates a small anti-aliased colored circle icon for use in menu items. */
export function getMenuDot(hex: string): Electron.NativeImage {
  const cached = _dotCache.get(hex)
  if (cached) return cached

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const bitmap = Buffer.alloc(DOT_SIZE * DOT_SIZE * 4, 0)
  const cx = DOT_SIZE / 2
  const cy = DOT_SIZE / 2
  const radius = DOT_SIZE / 2 - 1
  for (let y = 0; y < DOT_SIZE; y++) {
    for (let x = 0; x < DOT_SIZE; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist <= radius + 0.5) {
        // Smooth edge: fully opaque inside, fade out over 1px at the boundary
        const alpha = Math.min(1, Math.max(0, radius + 0.5 - dist))
        const off = (y * DOT_SIZE + x) * 4
        bitmap[off] = b
        bitmap[off + 1] = g
        bitmap[off + 2] = r
        bitmap[off + 3] = Math.round(alpha * 255)
      }
    }
  }

  const img = nativeImage.createFromBitmap(bitmap, { width: DOT_SIZE, height: DOT_SIZE })
  _dotCache.set(hex, img)
  return img
}

export function getAppIcon(): Electron.NativeImage {
  if (!_appIcon) {
    _appIcon = nativeImage.createFromBuffer(getIconBuffer())
  }
  return _appIcon
}
