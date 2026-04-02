import * as https from 'https'
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

function httpsRequest(url: string, options: https.RequestOptions, body?: string): Promise<{ status: number; json: () => Promise<unknown>; text: () => Promise<string>; ok: boolean }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const reqOptions: https.RequestOptions = {
      ...options,
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: 443
    }
    const req = https.request(reqOptions, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8')
        const status = res.statusCode ?? 0
        resolve({
          status,
          ok: status >= 200 && status < 300,
          text: () => Promise.resolve(raw),
          json: () => Promise.resolve(JSON.parse(raw))
        })
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
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
  const headers = getHeaders()

  const meRes = await httpsRequest(`${baseUrl}/rest/api/3/myself`, { method: 'GET', headers })
  if (!meRes.ok) throw new Error(`Jira API error (myself): ${meRes.status}`)
  const me = await meRes.json() as { accountId: string }
  const accountId = me.accountId

  const body = JSON.stringify({
    jql: `assignee = "${accountId}" AND status = "In Progress"`,
    fields: ['key', 'summary', 'status', 'project'],
    maxResults: 50
  })
  const res = await httpsRequest(`${baseUrl}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: { ...headers, 'Content-Length': Buffer.byteLength(body).toString() }
  }, body)

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
