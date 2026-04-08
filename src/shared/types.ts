// ── App Configuration ──

export interface AppConfig {
  jira: {
    accessToken: string
    refreshToken: string
    tokenExpiresAt: number  // Unix timestamp ms, 0 if unknown
    cloudId: string         // e.g. "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    domain: string          // e.g. "mycompany" (for browse URLs)
    userDisplayName: string
  }
  harvest: {
    accessToken: string
    refreshToken: string
    tokenExpiresAt: number  // Unix timestamp ms, 0 if unknown
    accountId: string
    userDisplayName: string
    baseUrl: string         // e.g. "https://emotiv.harvestapp.com"
  }
  schedule: {
    workStartHour: number // 0-23, default 9
    workStartMinute: number // 0-59, default 0
    workEndHour: number // 0-23, default 17
    workEndMinute: number // 0-59, default 0
    workDays: number[] // 0=Sun, 1=Mon, ..., 6=Sat. Default [1,2,3,4,5]
    checkPeriodMinutes: number // default 60
  }
  runOnStartup: boolean // default true
}

export const DEFAULT_CONFIG: AppConfig = {
  jira: { accessToken: '', refreshToken: '', tokenExpiresAt: 0, cloudId: '', domain: '', userDisplayName: '' },
  harvest: { accessToken: '', refreshToken: '', tokenExpiresAt: 0, accountId: '', userDisplayName: '', baseUrl: '' },
  schedule: {
    workStartHour: 9,
    workStartMinute: 0,
    workEndHour: 17,
    workEndMinute: 0,
    workDays: [1, 2, 3, 4, 5],
    checkPeriodMinutes: 60
  },
  runOnStartup: true
}

// ── Harvest API Types ──

export interface HarvestProject {
  id: number
  name: string
}

export interface HarvestTask {
  id: number
  name: string
}

export interface HarvestTimeEntry {
  id: number
  spent_date: string
  hours: number
  is_running: boolean
  timer_started_at: string | null
  notes: string | null
  project: HarvestProject
  task: HarvestTask
  external_reference?: {
    id: string
    group_id: string
    permalink: string
    service: string
    service_icon_url: string
  } | null
}

export interface HarvestPlatformResult {
  project_id: number | null
  task_id: number | null
  project_name: string | null
  task_name: string | null
}

export interface HarvestProjectAssignment {
  project: HarvestProject
  task_assignments: { task: HarvestTask }[]
}

// ── Jira API Types ──

export interface JiraIssue {
  id: string // numeric id as string
  key: string // e.g. "PROJ-123"
  fields: {
    summary: string
    status: {
      name: string
    }
    project: {
      id: string
      key: string
      name: string
    }
  }
}

// ── Update Types ──

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error'

export interface UpdateInfo {
  status: UpdateStatus
  currentVersion: string
  availableVersion: string | null
  downloadProgress: number // 0-100
  error: string | null
}

// ── Notification Types ──

export type NotificationView = 'no-timer' | 'eod-summary' | 'eod-running' | 'settings' | 'update-available' | 'update-success' | 'offline-confirm' | 'go-online' | 'tray-menu' | 'daily-scrum'

export interface DailyScrumPrefs {
  projectId: number | null
  taskId: number | null
  notes: string
}

export interface TrayMenuState {
  statusText: string
  hoursText: string | null
  state: 'checking' | 'not-authorized' | 'idle' | 'running' | 'offline'
  dotColor: string | null
  ticketKey: string | null
  harvestBaseUrl: string
}

// ── IPC Channel Types ──

export interface IpcChannels {
  'get-config': { args: void; result: AppConfig }
  'save-config': { args: AppConfig; result: void }
  'get-running-timer': { args: void; result: HarvestTimeEntry | null }
  'get-daily-hours': { args: { date: string }; result: number }
  'get-jira-tickets': { args: void; result: JiraIssue[] }
  'start-timer-for-ticket': { args: JiraIssue; result: HarvestTimeEntry }
  'stop-timer': { args: { entryId: number }; result: void }
  'dismiss': { args: void; result: void }
  'reschedule-eod-check': { args: void; result: void }
  'open-external': { args: { url: string }; result: void }
  'open-settings': { args: void; result: void }
  'get-harvest-projects': { args: void; result: HarvestProjectAssignment[] }
  'authorize-jira': { args: void; result: string | null }
  'authorize-harvest': { args: void; result: string | null }
  'disconnect-jira': { args: void; result: void }
  'disconnect-harvest': { args: void; result: void }
  'get-update-info': { args: void; result: UpdateInfo }
  'check-for-updates': { args: void; result: void }
  'install-update': { args: void; result: void }
  'go-offline': { args: { until: 'today' | 'manual' }; result: void }
  'go-online': { args: void; result: void }
  'get-offline-state': { args: void; result: { active: boolean; until: 'today' | 'manual' | null } }
}
