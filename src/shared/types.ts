// ── App Configuration ──

export interface AppConfig {
  jira: {
    email: string
    apiToken: string
    domain: string // e.g. "mycompany" for mycompany.atlassian.net
  }
  harvest: {
    accessToken: string
    accountId: string
  }
  schedule: {
    workStartHour: number // 0-23, default 9
    workStartMinute: number // 0-59, default 0
    workEndHour: number // 0-23, default 17
    workEndMinute: number // 0-59, default 0
    workDays: number[] // 0=Sun, 1=Mon, ..., 6=Sat. Default [1,2,3,4,5]
    checkPeriodMinutes: number // default 60
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  jira: { email: '', apiToken: '', domain: '' },
  harvest: { accessToken: '', accountId: '' },
  schedule: {
    workStartHour: 9,
    workStartMinute: 0,
    workEndHour: 17,
    workEndMinute: 0,
    workDays: [1, 2, 3, 4, 5],
    checkPeriodMinutes: 60
  }
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

// ── Notification Types ──

export type NotificationView = 'no-timer' | 'eod-summary' | 'eod-running' | 'settings'

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
  'open-external': { args: { url: string }; result: void }
  'open-settings': { args: void; result: void }
  'get-harvest-projects': { args: void; result: HarvestProjectAssignment[] }
  'validate-jira': { args: AppConfig; result: string | null }
  'validate-harvest': { args: AppConfig; result: string | null }
}
