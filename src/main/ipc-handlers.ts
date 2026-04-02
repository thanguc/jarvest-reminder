import { app, ipcMain, shell } from 'electron'
import { getConfig, saveConfig } from './services/config'
import {
  getRunningTimer,
  getDailyHours,
  startTimerForTicket,
  stopTimer,
  getProjectAssignments
} from './services/harvest'
import { getInProgressTickets } from './services/jira'
import { authorizeHarvest, authorizeJira, disconnectHarvest, disconnectJira } from './services/oauth'
import { closeNotification, closeSettings, showNotification, showSettings } from './windows'
import { AppConfig, JiraIssue } from '../shared/types'
import { isWithinWorkingHoursNow, restartScheduler } from './scheduler'
import { markEodSummaryShown } from './eod-state'
import { refreshTrayStatus, forceRefreshTrayStatus } from './tray'

export function registerIpcHandlers(): void {
  ipcMain.handle('get-config', () => {
    return getConfig()
  })

  ipcMain.handle('save-config', (_event, config: AppConfig) => {
    saveConfig(config)
    app.setLoginItemSettings({ openAtLogin: config.runOnStartup })
    restartScheduler()
  })

  ipcMain.handle('get-running-timer', async () => {
    return await getRunningTimer()
  })

  ipcMain.handle('get-daily-hours', async (_event, { date }: { date: string }) => {
    return await getDailyHours(date)
  })

  ipcMain.handle('get-jira-tickets', async () => {
    return await getInProgressTickets()
  })

  ipcMain.handle('start-timer-for-ticket', async (_event, issue: JiraIssue) => {
    const result = await startTimerForTicket(issue)
    forceRefreshTrayStatus().catch(console.error)
    return result
  })

  ipcMain.handle('stop-timer', async (_event, { entryId }: { entryId: number }) => {
    await stopTimer(entryId)
    forceRefreshTrayStatus().catch(console.error)
    if (!isWithinWorkingHoursNow()) {
      // Let the IPC response reach the renderer before replacing the window
      setTimeout(() => {
        markEodSummaryShown()
        showNotification('eod-summary')
      }, 300)
    }
  })

  ipcMain.handle('dismiss', () => {
    closeNotification()
    closeSettings()
  })

  ipcMain.handle('is-within-working-hours', () => {
    return isWithinWorkingHoursNow()
  })

  ipcMain.handle('reschedule-eod-check', () => {
    // EOD rechecks are now scheduled automatically at fixed intervals — no-op
  })

  ipcMain.handle('show-eod-summary', () => {
    markEodSummaryShown()
    showNotification('eod-summary')
  })

  ipcMain.handle('open-external', async (_event, { url }: { url: string }) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('open-settings', () => {
    showSettings()
  })

  ipcMain.handle('get-harvest-projects', async () => {
    return await getProjectAssignments()
  })

  ipcMain.handle('authorize-jira', async () => {
    try {
      await authorizeJira()
      refreshTrayStatus().catch(console.error)
      return null
    } catch (e) {
      return (e as Error).message
    }
  })

  ipcMain.handle('authorize-harvest', async () => {
    try {
      await authorizeHarvest()
      refreshTrayStatus().catch(console.error)
      return null
    } catch (e) {
      return (e as Error).message
    }
  })

  ipcMain.handle('disconnect-jira', () => {
    disconnectJira()
    refreshTrayStatus().catch(console.error)
  })

  ipcMain.handle('disconnect-harvest', () => {
    disconnectHarvest()
    refreshTrayStatus().catch(console.error)
  })
}
