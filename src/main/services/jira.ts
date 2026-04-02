import { net } from 'electron'
import { getConfig } from './config'
import { refreshJiraToken } from './oauth'
import { JiraIssue } from '../../shared/types'

const FETCH_TIMEOUT_MS = 30_000

function getBaseUrl(): string {
  const config = getConfig()
  return `https://api.atlassian.com/ex/jira/${config.jira.cloudId}`
}

function getHeaders(): Record<string, string> {
  const config = getConfig()
  return {
    Authorization: `Bearer ${config.jira.accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
}

async function jiraFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${getBaseUrl()}${path}`
  let res = await net.fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string>) },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })

  if (res.status === 401) {
    await refreshJiraToken()
    res = await net.fetch(url, {
      ...options,
      headers: { ...getHeaders(), ...(options.headers as Record<string, string>) },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    })
  }

  return res
}

export async function getInProgressTickets(): Promise<JiraIssue[]> {
  const meRes = await jiraFetch('/rest/api/3/myself')
  if (!meRes.ok) throw new Error(`Jira API error (myself): ${meRes.status}`)
  const me = await meRes.json() as { accountId: string }

  const body = JSON.stringify({
    jql: `assignee = "${me.accountId}" AND status = "In Progress"`,
    fields: ['key', 'summary', 'status', 'project'],
    maxResults: 50
  })

  const res = await jiraFetch('/rest/api/3/search/jql', { method: 'POST', body })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira API error: ${res.status} - ${text}`)
  }

  const data = await res.json() as { issues: JiraIssue[] }
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
