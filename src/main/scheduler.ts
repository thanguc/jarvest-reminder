import { getConfig, isConfigured } from './services/config'
import { getRunningTimer } from './services/harvest'
import { showNotification, isNotificationVisible } from './windows'

let checkTimeout: ReturnType<typeof setTimeout> | null = null
let checkInterval: ReturnType<typeof setInterval> | null = null
let eodTimeout: ReturnType<typeof setTimeout> | null = null
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

function msUntilTime(hour: number, minute: number): number {
  const now = new Date()
  const target = new Date()
  target.setHours(hour, minute, 0, 0)
  return target.getTime() - now.getTime()
}

async function performCheck(): Promise<void> {
  if (!isConfigured()) return
  if (isNotificationVisible()) return
  if (isEodSummaryShownToday()) return

  try {
    if (isEndOfDayMode) {
      await performEndOfDayCheck()
      return
    }

    if (!isWithinWorkingHoursNow()) {
      // Outside working hours: check if a timer was left running
      const config = getConfig()
      const now = new Date()
      if (config.schedule.workDays.includes(now.getDay())) {
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

  const config = getConfig()
  const { workStartHour, workStartMinute, workEndHour, workEndMinute, workDays, checkPeriodMinutes } = config.schedule

  // Startup check
  setTimeout(() => performCheck(), 5000)

  const now = new Date()
  if (!workDays.includes(now.getDay())) return

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = workStartHour * 60 + workStartMinute
  const endMinutes = workEndHour * 60 + workEndMinute

  // Schedule EOD check at exactly the end time
  if (currentMinutes < endMinutes) {
    eodTimeout = setTimeout(async () => {
      if (!isNotificationVisible() && !isEodSummaryShownToday()) {
        await performEndOfDayCheck()
      }
    }, msUntilTime(workEndHour, workEndMinute))
  }

  // Find the next schedule-aligned check time
  // e.g. work starts 8:30, period 30min → checks at 8:30, 9:00, 9:30...
  // If app launches at 8:40, next aligned check is 9:00
  let nextCheckMinutes: number
  if (currentMinutes < startMinutes) {
    nextCheckMinutes = startMinutes
  } else {
    const minutesSinceStart = currentMinutes - startMinutes
    const periodsElapsed = Math.floor(minutesSinceStart / checkPeriodMinutes)
    nextCheckMinutes = startMinutes + (periodsElapsed + 1) * checkPeriodMinutes
  }

  if (nextCheckMinutes >= endMinutes) return // no more checks today before EOD

  const nextCheckHour = Math.floor(nextCheckMinutes / 60)
  const nextCheckMinute = nextCheckMinutes % 60

  // Wait until the next aligned time, then run on a fixed interval
  checkTimeout = setTimeout(() => {
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
    if (nowMins < endMinutes) {
      performCheck()
    }

    const intervalMs = checkPeriodMinutes * 60 * 1000
    checkInterval = setInterval(() => {
      const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
      if (nowMins >= endMinutes) {
        clearInterval(checkInterval!)
        checkInterval = null
        return
      }
      performCheck()
    }, intervalMs)
  }, msUntilTime(nextCheckHour, nextCheckMinute))
}

export function stopScheduler(): void {
  if (checkTimeout) {
    clearTimeout(checkTimeout)
    checkTimeout = null
  }
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
  if (eodTimeout) {
    clearTimeout(eodTimeout)
    eodTimeout = null
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

export function scheduleEodRecheck(): void {
  const config = getConfig()
  const delayMs = config.schedule.checkPeriodMinutes * 60 * 1000
  if (eodTimeout) clearTimeout(eodTimeout)
  eodTimeout = setTimeout(async () => {
    if (!isNotificationVisible() && !isEodSummaryShownToday()) {
      await performEndOfDayCheck()
    }
  }, delayMs)
}
