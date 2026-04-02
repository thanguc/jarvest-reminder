import { getConfig, isConfigured } from './services/config'
import { getRunningTimer, getDailyHours } from './services/harvest'
import { showNotification, isNotificationVisible } from './windows'

let checkInterval: ReturnType<typeof setInterval> | null = null
let endOfDayCheckInterval: ReturnType<typeof setInterval> | null = null
let isEndOfDayMode = false
let eodSummaryShownDate: string | null = null

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function isEodSummaryShownToday(): boolean {
  return eodSummaryShownDate === getTodayStr()
}

export function markEodSummaryShown(): void {
  eodSummaryShownDate = getTodayStr()
  isEndOfDayMode = false
}

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

function isWithinWorkingHours(): boolean {
  return isWithinWorkingHoursNow()
}

function isEndOfDay(): boolean {
  const config = getConfig()
  const now = new Date()
  const day = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const endMinutes = config.schedule.workEndHour * 60 + config.schedule.workEndMinute

  if (!config.schedule.workDays.includes(day)) return false

  // Within 5 minutes of end of day
  return currentMinutes >= endMinutes && currentMinutes < endMinutes + 5
}

async function performCheck(): Promise<void> {
  if (!isConfigured()) return
  if (isNotificationVisible()) return
  if (isEodSummaryShownToday()) return // Done for the day

  try {
    if (isEndOfDay() || isEndOfDayMode) {
      await performEndOfDayCheck()
      return
    }

    if (!isWithinWorkingHours()) {
      // Outside working hours: still check if a timer was left running
      const config = getConfig()
      const now = new Date()
      const day = now.getDay()
      if (config.schedule.workDays.includes(day)) {
        const runningTimer = await getRunningTimer()
        if (runningTimer) {
          isEndOfDayMode = true
          showNotification('eod-running')
        }
      }
      return
    }

    const runningTimer = await getRunningTimer()
    if (!runningTimer) {
      showNotification('no-timer')
    }
  } catch (error) {
    console.error('Check failed:', error)
  }
}

async function performEndOfDayCheck(): Promise<void> {
  try {
    const runningTimer = await getRunningTimer()

    if (runningTimer) {
      isEndOfDayMode = true
      showNotification('eod-running')
    } else {
      if (!isEodSummaryShownToday()) {
        markEodSummaryShown()
        showNotification('eod-summary')
      }
    }
  } catch (error) {
    console.error('End-of-day check failed:', error)
  }
}

export function startScheduler(): void {
  stopScheduler()

  // Do initial check after a short delay to let the app settle
  setTimeout(() => performCheck(), 5000)

  // Set up periodic check
  const config = getConfig()
  const intervalMs = config.schedule.checkPeriodMinutes * 60 * 1000
  checkInterval = setInterval(() => performCheck(), intervalMs)

  // Also check every minute for end-of-day transitions
  endOfDayCheckInterval = setInterval(() => {
    if (isEndOfDay() && !isNotificationVisible() && !isEodSummaryShownToday()) {
      performEndOfDayCheck()
    }
  }, 60 * 1000)
}

export function stopScheduler(): void {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
  if (endOfDayCheckInterval) {
    clearInterval(endOfDayCheckInterval)
    endOfDayCheckInterval = null
  }
  isEndOfDayMode = false
}

export function restartScheduler(): void {
  stopScheduler()
  startScheduler()
}

export function triggerEndOfDayRecheck(): void {
  isEndOfDayMode = true
}
