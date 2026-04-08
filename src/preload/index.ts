import { contextBridge, ipcRenderer } from 'electron'
import { AppConfig, DailyScrumPrefs, JiraIssue, TrayMenuState, UpdateInfo } from '../shared/types'

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
  resizeNotification: (height: number): Promise<void> => ipcRenderer.invoke('resize-notification', { height }),
  isWithinWorkingHours: (): Promise<boolean> => ipcRenderer.invoke('is-within-working-hours'),
  showEodSummary: (): Promise<void> => ipcRenderer.invoke('show-eod-summary'),
  rescheduleEodCheck: (): Promise<void> => ipcRenderer.invoke('reschedule-eod-check'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', { url }),
  openSettings: (tab?: string) => ipcRenderer.invoke('open-settings', { tab }),
  getHarvestProjects: () => ipcRenderer.invoke('get-harvest-projects'),
  authorizeJira: (): Promise<string | null> => ipcRenderer.invoke('authorize-jira'),
  authorizeHarvest: (): Promise<string | null> => ipcRenderer.invoke('authorize-harvest'),
  disconnectJira: (): Promise<void> => ipcRenderer.invoke('disconnect-jira'),
  disconnectHarvest: (): Promise<void> => ipcRenderer.invoke('disconnect-harvest'),
  getUpdateInfo: (): Promise<UpdateInfo> => ipcRenderer.invoke('get-update-info'),
  checkForUpdates: (): Promise<void> => ipcRenderer.invoke('check-for-updates'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('install-update'),
  getReleaseNotes: (): Promise<{ version: string; body: string } | null> =>
    ipcRenderer.invoke('get-release-notes'),
  goOffline: (until: 'today' | 'manual'): Promise<void> => ipcRenderer.invoke('go-offline', { until }),
  goOnline: (): Promise<void> => ipcRenderer.invoke('go-online'),
  getOfflineState: (): Promise<{ active: boolean; until: 'today' | 'manual' | null }> =>
    ipcRenderer.invoke('get-offline-state'),
  onUpdateStatusChanged: (callback: (info: UpdateInfo) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo): void => callback(info)
    ipcRenderer.on('update-status-changed', handler)
    return () => ipcRenderer.removeListener('update-status-changed', handler)
  },
  getTrayMenuState: (): Promise<TrayMenuState | null> => ipcRenderer.invoke('get-tray-menu-state'),
  trayMenuAction: (action: string): Promise<void> => ipcRenderer.invoke('tray-menu-action', { action }),
  closeTrayMenu: (): Promise<void> => ipcRenderer.invoke('close-tray-menu'),
  onTrayMenuStateChanged: (callback: (state: TrayMenuState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: TrayMenuState): void => callback(state)
    ipcRenderer.on('tray-menu-state', handler)
    return () => ipcRenderer.removeListener('tray-menu-state', handler)
  },
  getDailyScrumPrefs: (): Promise<DailyScrumPrefs> => ipcRenderer.invoke('get-daily-scrum-prefs'),
  saveDailyScrumPrefs: (prefs: DailyScrumPrefs): Promise<void> => ipcRenderer.invoke('save-daily-scrum-prefs', prefs),
  logDailyScrum: (projectId: number, taskId: number, hours: number, notes: string, spentDate?: string): Promise<void> =>
    ipcRenderer.invoke('log-daily-scrum', { projectId, taskId, hours, notes, spentDate })
}

export type JarvestApi = typeof api

contextBridge.exposeInMainWorld('jarvest', api)
