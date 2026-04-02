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
  isWithinWorkingHours: (): Promise<boolean> => ipcRenderer.invoke('is-within-working-hours'),
  showEodSummary: (): Promise<void> => ipcRenderer.invoke('show-eod-summary'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', { url }),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  getHarvestProjects: () => ipcRenderer.invoke('get-harvest-projects'),
  authorizeJira: (): Promise<string | null> => ipcRenderer.invoke('authorize-jira'),
  authorizeHarvest: (): Promise<string | null> => ipcRenderer.invoke('authorize-harvest'),
  disconnectJira: (): Promise<void> => ipcRenderer.invoke('disconnect-jira'),
  disconnectHarvest: (): Promise<void> => ipcRenderer.invoke('disconnect-harvest')
}

export type JarvestApi = typeof api

contextBridge.exposeInMainWorld('jarvest', api)
