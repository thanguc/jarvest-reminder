import { net } from 'electron'
import { getConfig } from './config'
import { JiraIssue } from '../../shared/types'

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
