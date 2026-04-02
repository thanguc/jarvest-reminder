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

export function getTrayIcon(): Electron.NativeImage {
  if (!_trayIcon) {
    const img = nativeImage.createFromBuffer(getIconBuffer())
    _trayIcon = img.resize({ width: 32, height: 32 })
  }
  return _trayIcon
}

export function getAppIcon(): Electron.NativeImage {
  if (!_appIcon) {
    _appIcon = nativeImage.createFromBuffer(getIconBuffer())
  }
  return _appIcon
}
