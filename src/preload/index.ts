import { contextBridge, ipcRenderer } from 'electron'
import { AppConfig, JiraIssue, UpdateInfo } from '../shared/types'

const api = {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke('save-config', config),
  setRunOnStartup: (enabled: boolean): Promise<void> => ipcRenderer.invoke('set-run-on-startup', enabled),
  getRunningTimer: () => ipcRenderer.invoke('get-running-timer'),
  getDailyHours: (date: string) => ipcRenderer.invoke('get-daily-hours', { date }),
  getJiraTickets: () => ipcRenderer.invoke('get-jira-tickets'),
  startTimerForTicket: (issue: JiraIssue) =>
    ipcRenderer.invoke('start-timer-for-ticket', issue),
  stopTimer: (entryId: number) => ipcRenderer.invoke('stop-timer', { entryId }),
  dismiss: () => ipcRenderer.invoke('dismiss'),
  isWithinWorkingHours: (): Promise<boolean> => ipcRenderer.invoke('is-within-working-hours'),
  showEodSummary: (): Promise<void> => ipcRenderer.invoke('show-eod-summary'),
  rescheduleEodCheck: (): Promise<void> => ipcRenderer.invoke('reschedule-eod-check'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', { url }),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  getHarvestProjects: () => ipcRenderer.invoke('get-harvest-projects'),
  authorizeJira: (): Promise<string | null> => ipcRenderer.invoke('authorize-jira'),
  authorizeHarvest: (): Promise<string | null> => ipcRenderer.invoke('authorize-harvest'),
  disconnectJira: (): Promise<void> => ipcRenderer.invoke('disconnect-jira'),
  disconnectHarvest: (): Promise<void> => ipcRenderer.invoke('disconnect-harvest'),
  getUpdateInfo: (): Promise<UpdateInfo> => ipcRenderer.invoke('get-update-info'),
  checkForUpdates: (): Promise<void> => ipcRenderer.invoke('check-for-updates'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('install-update'),
  onUpdateStatusChanged: (callback: (info: UpdateInfo) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo): void => callback(info)
    ipcRenderer.on('update-status-changed', handler)
    return () => ipcRenderer.removeListener('update-status-changed', handler)
  }
}

export type JarvestApi = typeof api

contextBridge.exposeInMainWorld('jarvest', api)
