import { getConfig, isConfigured } from './services/config'
import { getRunningTimer, getDailyHours } from './services/harvest'
import { showNotification, isNotificationVisible } from './windows'

let checkInterval: ReturnType<typeof setInterval> | null = null
let endOfDayCheckInterval: ReturnType<typeof setInterval> | null = null
let isEndOfDayMode = false

function isWithinWorkingHours(): boolean {
  const config = getConfig()
  const now = new Date()
  const day = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = config.schedule.workStartHour * 60 + config.schedule.workStartMinute
  const endMinutes = config.schedule.workEndHour * 60 + config.schedule.workEndMinute

  if (!config.schedule.workDays.includes(day)) return false
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
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
  if (isNotificationVisible()) return // Don't show another notification if one is visible

  try {
    if (isEndOfDay() || isEndOfDayMode) {
      await performEndOfDayCheck()
      return
    }

    if (!isWithinWorkingHours()) return

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
      isEndOfDayMode = false
      showNotification('eod-summary')
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
    if (isEndOfDay() && !isNotificationVisible()) {
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
