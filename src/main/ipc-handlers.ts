import { ipcMain, shell } from 'electron'
import { getConfig, saveConfig } from './services/config'
import {
  getRunningTimer,
  getDailyHours,
  startTimerForTicket,
  stopTimer,
  getProjectAssignments
} from './services/harvest'
import { getInProgressTickets } from './services/jira'
import { closeNotification, showSettings } from './windows'
import { AppConfig, JiraIssue } from '../shared/types'

export function registerIpcHandlers(): void {
  ipcMain.handle('get-config', () => {
    return getConfig()
  })

  ipcMain.handle('save-config', (_event, config: AppConfig) => {
    saveConfig(config)
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
    return await startTimerForTicket(issue)
  })

  ipcMain.handle('stop-timer', async (_event, { entryId }: { entryId: number }) => {
    await stopTimer(entryId)
  })

  ipcMain.handle('dismiss', () => {
    closeNotification()
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
}
