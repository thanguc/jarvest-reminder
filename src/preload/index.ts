import { contextBridge, ipcRenderer } from 'electron'
import { AppConfig, JiraIssue } from '../shared/types'

const api = {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke('save-config', config),
  getRunningTimer: () => ipcRenderer.invoke('get-running-timer'),
  getDailyHours: (date: string) => ipcRenderer.invoke('get-daily-hours', { date }),
  getJiraTickets: () => ipcRenderer.invoke('get-jira-tickets'),
  startTimerForTicket: (issue: JiraIssue) =>
    ipcRenderer.invoke('start-timer-for-ticket', issue),
  stopTimer: (entryId: number) => ipcRenderer.invoke('stop-timer', { entryId }),
  dismiss: () => ipcRenderer.invoke('dismiss'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', { url }),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  getHarvestProjects: () => ipcRenderer.invoke('get-harvest-projects'),
  validateJira: (config: AppConfig): Promise<string | null> => ipcRenderer.invoke('validate-jira', config),
  validateHarvest: (config: AppConfig): Promise<string | null> => ipcRenderer.invoke('validate-harvest', config)
}

export type JarvestApi = typeof api

contextBridge.exposeInMainWorld('jarvest', api)
