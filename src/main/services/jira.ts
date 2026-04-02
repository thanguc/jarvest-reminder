import { net } from 'electron'
import { getConfig } from './config'
import { AppConfig, JiraIssue } from '../../shared/types'

function getBaseUrl(): string {
  const config = getConfig()
  return `https://${config.jira.domain}.atlassian.net`
}

function getHeaders(): Record<string, string> {
  const config = getConfig()
  const credentials = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString(
    'base64'
  )
  return {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
}

export async function validateJiraConfig(config: AppConfig): Promise<void> {
  const baseUrl = `https://${config.jira.domain}.atlassian.net`
  const credentials = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString('base64')
  const headers = { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json', Accept: 'application/json' }
  const res = await net.fetch(`${baseUrl}/rest/api/3/myself`, { headers })
  if (res.status === 401) throw new Error('Invalid email or API token')
  if (res.status === 404) throw new Error('Domain not found')
  if (!res.ok) throw new Error(`Jira error: ${res.status}`)
}

export async function getInProgressTickets(): Promise<JiraIssue[]> {
  const baseUrl = getBaseUrl()
  const jql = encodeURIComponent('assignee = currentUser() AND status = "In Progress"')
  const fields = 'key,summary,status,project'
  const url = `${baseUrl}/rest/api/3/search?jql=${jql}&fields=${fields}&maxResults=50`

  const res = await net.fetch(url, { headers: getHeaders() })
  if (!res.ok) throw new Error(`Jira API error: ${res.status}`)

  const data = await res.json()
  return data.issues
}

export function getBrowseUrl(issueKey: string): string {
  const config = getConfig()
  return `https://${config.jira.domain}.atlassian.net/browse/${issueKey}`
}

export function getOpenIssuesUrl(): string {
  const config = getConfig()
  const jql = encodeURIComponent(
    'assignee = currentUser() AND status in (Open, "To Do", "In Progress") ORDER BY updated DESC'
  )
  return `https://${config.jira.domain}.atlassian.net/issues/?jql=${jql}`
}
