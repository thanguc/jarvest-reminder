import { nativeImage } from 'electron'
import { deflateSync } from 'zlib'

type RGBA = [number, number, number, number]

const ORANGE: RGBA = [0xf2, 0x7a, 0x20, 255]
const BLUE: RGBA = [0x15, 0x58, 0xbc, 255]
const WHITE: RGBA = [255, 255, 255, 230]
const TRANSPARENT: RGBA = [0, 0, 0, 0]

function isInRoundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): boolean {
  if (x < r && y < r) return (x - r) ** 2 + (y - r) ** 2 <= r * r
  if (x >= w - r && y < r) return (x - (w - r - 1)) ** 2 + (y - r) ** 2 <= r * r
  if (x < r && y >= h - r) return (x - r) ** 2 + (y - (h - r - 1)) ** 2 <= r * r
  if (x >= w - r && y >= h - r)
    return (x - (w - r - 1)) ** 2 + (y - (h - r - 1)) ** 2 <= r * r
  return true
}

function drawIcon(size: number): Buffer {
  const s = size / 32 // scale factor relative to 32x32 base
  const r = Math.round(6 * s)

  const inBar1 = (x: number, y: number): boolean =>
    x >= Math.round(5 * s) &&
    x < Math.round(9 * s) &&
    y >= Math.round(6 * s) &&
    y < Math.round(26 * s)

  const inBar2 = (x: number, y: number): boolean =>
    x >= Math.round(11 * s) &&
    x < Math.round(15 * s) &&
    y >= Math.round(6 * s) &&
    y < Math.round(26 * s)

  const inTTop = (x: number, y: number): boolean =>
    x >= Math.round(17 * s) &&
    x < Math.round(28 * s) &&
    y >= Math.round(6 * s) &&
    y < Math.round(11 * s)

  const inTStem = (x: number, y: number): boolean =>
    x >= Math.round(17 * s) &&
    x < Math.round(22 * s) &&
    y >= Math.round(11 * s) &&
    y < Math.round(26 * s)

  // Raw pixel data with filter byte per row
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const rowOff = y * (1 + size * 4)
    raw[rowOff] = 0 // no filter
    for (let x = 0; x < size; x++) {
      let px: RGBA
      if (!isInRoundedRect(x, y, size, size, r)) {
        px = TRANSPARENT
      } else if (inBar1(x, y) || inBar2(x, y)) {
        px = ORANGE
      } else if (inTTop(x, y) || inTStem(x, y)) {
        px = WHITE
      } else {
        px = BLUE
      }
      const off = rowOff + 1 + x * 4
      raw[off] = px[0]
      raw[off + 1] = px[1]
      raw[off + 2] = px[2]
      raw[off + 3] = px[3]
    }
  }

  const compressed = deflateSync(raw)
  return buildPng(size, size, compressed)
}

// --- PNG encoder (minimal, no dependencies) ---

const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function buildPng(w: number, h: number, idatData: Buffer): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idatData),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

// --- Cached icons ---

let _trayIcon: Electron.NativeImage | null = null
let _appIcon: Electron.NativeImage | null = null

export function getTrayIcon(): Electron.NativeImage {
  if (!_trayIcon) {
    _trayIcon = nativeImage.createFromBuffer(drawIcon(32), {
      width: 32,
      height: 32
    })
  }
  return _trayIcon
}

export function getAppIcon(): Electron.NativeImage {
  if (!_appIcon) {
    _appIcon = nativeImage.createFromBuffer(drawIcon(256))
  }
  return _appIcon
}
