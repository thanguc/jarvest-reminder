import { getConfig, isConfigured } from './services/config'
import { getRunningTimer } from './services/harvest'
import { showNotification, isNotificationVisible } from './windows'
import { refreshTrayStatus, forceRefreshTrayStatus } from './tray'
import { isEodSummaryShownToday, markEodSummaryShown } from './eod-state'
import {
  isOfflineMode,
  clearOfflineMode,
  isOfflineExpiredForNewDay
} from './offline-state'

export { markEodSummaryShown }

let startupTimeout: ReturnType<typeof setTimeout> | null = null
let checkTimeout: ReturnType<typeof setTimeout> | null = null
let checkInterval: ReturnType<typeof setInterval> | null = null
let eodTimeouts: ReturnType<typeof setTimeout>[] = []
let midnightTimeout: ReturnType<typeof setTimeout> | null = null

export function isWithinWorkingHoursNow(): boolean {
  const config = getConfig()
  const now = new Date()
  const day = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = config.schedule.workStartHour * 60 + config.schedule.workStartMinute
  const endMinutes = config.schedule.workEndHour * 60 + config.schedule.workEndMinute

  if (!config.schedule.workDays.includes(day)) return false
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/** Returns true when the current time is past the configured work end time on a work day. */
export function isPastWorkEndTime(): boolean {
  const config = getConfig()
  const now = new Date()
  const day = now.getDay()
  if (!config.schedule.workDays.includes(day)) return false
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const endMinutes = config.schedule.workEndHour * 60 + config.schedule.workEndMinute
  return currentMinutes >= endMinutes
}

function msUntilTime(hour: number, minute: number): number {
  const now = new Date()
  const target = new Date()
  target.setHours(hour, minute, 0, 0)
  return target.getTime() - now.getTime()
}

function timestamp(): string {
  return new Date().toLocaleTimeString()
}

/**
 * Exits offline mode, refreshes tray, shows the "back online" notification,
 * then restarts the scheduler 5.5s later (after the notification auto-dismisses).
 */
export async function handleGoOnline(reason?: string): Promise<void> {
  clearOfflineMode()
  forceRefreshTrayStatus().catch(console.error)
  showNotification('go-online', reason ? { reason } : undefined)
  setTimeout(() => {
    restartScheduler()
    forceRefreshTrayStatus().catch(console.error)
  }, 5500)
}

async function performEndOfDayCheck(): Promise<void> {
  console.log(`[scheduler] EOD check at ${timestamp()}`)
  if (!isConfigured()) { console.log('[scheduler] skipped — not configured'); return }
  if (isNotificationVisible()) { console.log('[scheduler] skipped — notification visible'); return }

  try {
    const runningTimer = await getRunningTimer()

    // In offline mode, only watch for running timers to auto-exit
    if (isOfflineMode()) {
      if (runningTimer) {
        console.log('[scheduler] offline mode — running timer detected at EOD, going online')
        await handleGoOnline('timer-detected')
      } else {
        console.log('[scheduler] offline mode — skipping EOD notification')
      }
      return
    }

    if (runningTimer) {
      console.log(`[scheduler] timer running (${runningTimer.id}) — showing eod-running`)
      showNotification('eod-running')
    } else if (!isEodSummaryShownToday()) {
      console.log('[scheduler] no timer — showing eod-summary')
      markEodSummaryShown()
      showNotification('eod-summary')
    } else {
      console.log('[scheduler] no timer — EOD summary already shown, skipping')
    }
  } catch (error) {
    console.error('[scheduler] EOD check failed:', error)
  }
}

async function performCheck(): Promise<void> {
  console.log(`[scheduler] work-hours check at ${timestamp()}`)
  if (!isConfigured()) { console.log('[scheduler] skipped — not configured'); return }
  if (isNotificationVisible()) { console.log('[scheduler] skipped — notification visible'); return }

  try {
    if (!isWithinWorkingHoursNow()) {
      const config = getConfig()
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const endMinutes = config.schedule.workEndHour * 60 + config.schedule.workEndMinute
      // Only do an EOD check if we're past the work end time, not before the day starts
      if (config.schedule.workDays.includes(now.getDay()) && currentMinutes >= endMinutes) {
        console.log('[scheduler] past work end — delegating to EOD check')
        await performEndOfDayCheck()
      } else {
        console.log('[scheduler] before work start — nothing to do')
      }
      return
    }

    const runningTimer = await getRunningTimer()

    // In offline mode, only watch for running timers to auto-exit; skip no-timer reminders
    if (isOfflineMode()) {
      if (runningTimer) {
        console.log('[scheduler] offline mode — running timer detected, going online')
        await handleGoOnline('timer-detected')
      } else {
        console.log('[scheduler] offline mode — skipping no-timer notification')
      }
      return
    }

    if (!runningTimer) {
      console.log('[scheduler] no timer — showing no-timer')
      showNotification('no-timer')
    } else {
      console.log(`[scheduler] timer running (${runningTimer.id}) — no action`)
    }
  } catch (error) {
    console.error('[scheduler] check failed:', error)
  }
  refreshTrayStatus().catch(console.error)
}

export function startScheduler(): void {
  stopScheduler()

  // Handle day rollover: if 'just today' offline mode has expired, exit it with notification
  if (isOfflineExpiredForNewDay()) {
    console.log('[scheduler] "just today" offline mode expired at new day — going online')
    handleGoOnline().catch(console.error)
    // handleGoOnline will call restartScheduler after 5.5s
    return
  }

  const config = getConfig()
  const { workStartHour, workStartMinute, workEndHour, workEndMinute, workDays, checkPeriodMinutes } = config.schedule

  // Startup check after 5s (handles both in-hours and outside-hours cases)
  startupTimeout = setTimeout(() => performCheck(), 5000)

  // Schedule a restart at midnight so the scheduler works across days
  scheduleMidnightRestart()

  const now = new Date()
  if (!workDays.includes(now.getDay())) return

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = workStartHour * 60 + workStartMinute
  const endMinutes = workEndHour * 60 + workEndMinute

  // ── Working-hours interval checks ──────────────────────────────────────────
  // Aligned to workStart + multiples of checkPeriod, e.g. 8:30, 9:30, 10:30…
  if (currentMinutes < endMinutes) {
    let nextCheckMinutes: number
    if (currentMinutes < startMinutes) {
      nextCheckMinutes = startMinutes
    } else {
      const minutesSinceStart = currentMinutes - startMinutes
      const periodsElapsed = Math.floor(minutesSinceStart / checkPeriodMinutes)
      nextCheckMinutes = startMinutes + (periodsElapsed + 1) * checkPeriodMinutes
    }

    if (nextCheckMinutes < endMinutes) {
      const nextCheckHour = Math.floor(nextCheckMinutes / 60)
      const nextCheckMinute = nextCheckMinutes % 60

      checkTimeout = setTimeout(() => {
        const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
        if (nowMins < endMinutes) performCheck()

        const intervalMs = checkPeriodMinutes * 60 * 1000
        checkInterval = setInterval(() => {
          const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
          if (nowMins >= endMinutes || nowMins < startMinutes) {
            clearInterval(checkInterval!)
            checkInterval = null
            return
          }
          performCheck()
        }, intervalMs)
      }, msUntilTime(nextCheckHour, nextCheckMinute))
    }
  }

  // ── EOD interval checks ────────────────────────────────────────────────────
  // Starts at workEnd, repeats every checkPeriod until midnight.
  // e.g. workEnd=17:45, period=60 → checks at 17:45, 18:45, …, 23:45
  const MIDNIGHT_MINUTES = 24 * 60
  const scheduledEodTimes: string[] = []
  let eodCheckMinutes = endMinutes
  while (eodCheckMinutes < MIDNIGHT_MINUTES) {
    const eodHour = Math.floor(eodCheckMinutes / 60)
    const eodMinute = eodCheckMinutes % 60
    const msUntil = msUntilTime(eodHour, eodMinute)
    if (msUntil > 0) {
      scheduledEodTimes.push(`${String(eodHour).padStart(2, '0')}:${String(eodMinute).padStart(2, '0')}`)
      eodTimeouts.push(
        setTimeout(async () => {
          await performEndOfDayCheck()
        }, msUntil)
      )
    }
    eodCheckMinutes += checkPeriodMinutes
  }
  console.log(`[scheduler] EOD checks scheduled at: ${scheduledEodTimes.join(', ') || 'none (all in the past)'}`)
}

function scheduleMidnightRestart(): void {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 30, 0) // 30s past midnight to avoid edge cases
  const msUntilMidnight = midnight.getTime() - now.getTime()
  console.log(`[scheduler] midnight restart scheduled in ${Math.round(msUntilMidnight / 60000)}m`)
  midnightTimeout = setTimeout(() => {
    console.log(`[scheduler] midnight restart triggered at ${timestamp()}`)
    // isOfflineExpiredForNewDay() check is handled inside startScheduler
    restartScheduler()
  }, msUntilMidnight)
}

export function stopScheduler(): void {
  if (startupTimeout) {
    clearTimeout(startupTimeout)
    startupTimeout = null
  }
  if (checkTimeout) {
    clearTimeout(checkTimeout)
    checkTimeout = null
  }
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
  eodTimeouts.forEach(t => clearTimeout(t))
  eodTimeouts = []
  if (midnightTimeout) {
    clearTimeout(midnightTimeout)
    midnightTimeout = null
  }
}

export function restartScheduler(): void {
  stopScheduler()
  startScheduler()
}

