import { ipcMain, shell } from 'electron'
import { getConfig, saveConfig } from './services/config'
import {
  getRunningTimer,
  getDailyHours,
  startTimerForTicket,
  stopTimer,
  getProjectAssignments,
  validateHarvestConfig
} from './services/harvest'
import { getInProgressTickets, validateJiraConfig } from './services/jira'
import { closeNotification, closeSettings, showSettings } from './windows'
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
    closeSettings()
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

  ipcMain.handle('validate-jira', async (_event, config: AppConfig) => {
    try {
      await validateJiraConfig(config)
      return null
    } catch (e) {
      return (e as Error).message
    }
  })

  ipcMain.handle('validate-harvest', async (_event, config: AppConfig) => {
    try {
      await validateHarvestConfig(config)
      return null
    } catch (e) {
      return (e as Error).message
    }
  })
}
