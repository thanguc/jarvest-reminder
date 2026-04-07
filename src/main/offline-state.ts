import { getPersistedOfflineState, setPersistedOfflineState } from './services/config'

export type OfflineUntil = 'today' | 'manual'

// In-memory cache — initialised from disk on first access via initFromDisk()
let offlineModeActive = false
let offlineUntil: OfflineUntil | null = null
let offlineDate: string | null = null
let initialised = false

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function initFromDisk(): void {
  if (initialised) return
  initialised = true
  const saved = getPersistedOfflineState()
  offlineModeActive = saved.active
  offlineUntil = saved.until
  offlineDate = saved.date
}

function persist(): void {
  setPersistedOfflineState({ active: offlineModeActive, until: offlineUntil, date: offlineDate })
}

/** Returns true if offline mode is active (auto-clears 'today' mode when a new day begins). */
export function isOfflineMode(): boolean {
  initFromDisk()
  if (!offlineModeActive) return false
  if (offlineUntil === 'today' && offlineDate !== getTodayStr()) {
    clearOfflineMode()
    return false
  }
  return true
}

/** Returns true if offline mode is set, WITHOUT triggering auto-clear. Use to peek at raw state. */
export function isOfflineModeActive(): boolean {
  initFromDisk()
  return offlineModeActive
}

/** Returns the until value of the current offline mode without triggering auto-clear. */
export function getOfflineUntil(): OfflineUntil | null {
  initFromDisk()
  return offlineModeActive ? offlineUntil : null
}

/**
 * Returns true when offline mode is 'today' and the stored date no longer matches today.
 * Used at scheduler start to detect day rollover during sleep/wakeup.
 */
export function isOfflineExpiredForNewDay(): boolean {
  initFromDisk()
  return offlineModeActive && offlineUntil === 'today' && offlineDate !== getTodayStr()
}

export function setOfflineMode(until: OfflineUntil): void {
  initFromDisk()
  offlineModeActive = true
  offlineUntil = until
  offlineDate = getTodayStr()
  persist()
}

export function clearOfflineMode(): void {
  offlineModeActive = false
  offlineUntil = null
  offlineDate = null
  persist()
}
