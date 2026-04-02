import { net } from 'electron'
import { getConfig } from './config'
import {
  AppConfig,
  HarvestTimeEntry,
  HarvestPlatformResult,
  HarvestProjectAssignment,
  JiraIssue
} from '../../shared/types'

const BASE_URL = 'https://api.harvestapp.com/v2'

function getHeaders(): Record<string, string> {
  const config = getConfig()
  return {
    Authorization: `Bearer ${config.harvest.accessToken}`,
    'Harvest-Account-Id': config.harvest.accountId,
    'User-Agent': 'JarvestTimer',
    'Content-Type': 'application/json'
  }
}

async function harvestFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${BASE_URL}${path}`
  const headers = getHeaders()
  return net.fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) }
  })
}

export async function validateHarvestConfig(config: AppConfig): Promise<void> {
  const headers = {
    Authorization: `Bearer ${config.harvest.accessToken}`,
    'Harvest-Account-Id': config.harvest.accountId,
    'User-Agent': 'JarvestTimer',
    'Content-Type': 'application/json'
  }
  const res = await net.fetch(`${BASE_URL}/users/me`, { headers })
  if (res.status === 401) throw new Error('Invalid access token or account ID')
  if (!res.ok) throw new Error(`Harvest error: ${res.status}`)
}

export async function getRunningTimer(): Promise<HarvestTimeEntry | null> {
  const res = await harvestFetch('/time_entries?is_running=true')
  if (!res.ok) throw new Error(`Harvest API error: ${res.status}`)
  const data = await res.json()
  const entries: HarvestTimeEntry[] = data.time_entries
  return entries.length > 0 ? entries[0] : null
}

export async function getDailyEntries(date: string): Promise<HarvestTimeEntry[]> {
  const res = await harvestFetch(`/time_entries?from=${date}&to=${date}`)
  if (!res.ok) throw new Error(`Harvest API error: ${res.status}`)
  const data = await res.json()
  return data.time_entries
}

export async function getDailyHours(date: string): Promise<number> {
  const entries = await getDailyEntries(date)
  return entries.reduce((sum, e) => sum + e.hours, 0)
}

export async function stopTimer(entryId: number): Promise<void> {
  const res = await harvestFetch(`/time_entries/${entryId}/stop`, { method: 'PATCH' })
  if (!res.ok) throw new Error(`Harvest API error: ${res.status}`)
}

export async function getPlatformSuggestion(
  issue: JiraIssue
): Promise<HarvestPlatformResult> {
  const config = getConfig()
  const domain = config.jira.domain
  const permalink = encodeURIComponent(
    `https://${domain}.atlassian.net/browse/${issue.key}`
  )
  const externalItemId = encodeURIComponent(issue.id)
  const externalItemName = encodeURIComponent(`${issue.key}: ${issue.fields.summary}`)
  const externalGroupId = encodeURIComponent(issue.fields.project.id)
  const externalGroupName = encodeURIComponent(issue.fields.project.name)

  const queryString = [
    `permalink=${permalink}`,
    `external_item_id=${externalItemId}`,
    `external_item_name=${externalItemName}`,
    `external_group_id=${externalGroupId}`,
    `external_group_name=${externalGroupName}`,
    `service=JIRA`,
    `app_name=JIRA`
  ].join('&')

  const res = await harvestFetch(`/platform?${queryString}`)
  if (!res.ok) throw new Error(`Harvest Platform API error: ${res.status}`)
  const data = await res.json()

  return {
    project_id: data.project?.id ?? null,
    task_id: data.task?.id ?? null,
    project_name: data.project?.name ?? null,
    task_name: data.task?.name ?? null
  }
}

export async function startTimerForTicket(issue: JiraIssue): Promise<HarvestTimeEntry> {
  const config = getConfig()
  const domain = config.jira.domain

  // Try platform suggestion first
  const suggestion = await getPlatformSuggestion(issue)

  if (!suggestion.project_id || !suggestion.task_id) {
    throw new Error(
      'No Harvest project/task mapping found for this Jira ticket. ' +
        'Please log time for this project in Harvest first to establish a mapping.'
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const body = {
    project_id: suggestion.project_id,
    task_id: suggestion.task_id,
    spent_date: today,
    notes: `${issue.key}: ${issue.fields.summary}`,
    is_running: true,
    external_reference: {
      id: issue.id,
      group_id: issue.fields.project.id,
      permalink: `https://${domain}.atlassian.net/browse/${issue.key}`,
      service: 'app.asana.com', // Harvest uses this identifier for Jira
      service_icon_url: `https://${domain}.atlassian.net/favicon.ico`
    }
  }

  const res = await harvestFetch('/time_entries', {
    method: 'POST',
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Failed to create time entry: ${res.status} ${errBody}`)
  }

  return await res.json()
}

export async function getProjectAssignments(): Promise<HarvestProjectAssignment[]> {
  const res = await harvestFetch('/users/me/project_assignments')
  if (!res.ok) throw new Error(`Harvest API error: ${res.status}`)
  const data = await res.json()
  return data.project_assignments
}
