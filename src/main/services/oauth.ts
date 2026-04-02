import http from 'http'
import { shell, net } from 'electron'
import { getConfig, saveConfig } from './config'

const OAUTH_PORT = 34115

const HARVEST_CLIENT_ID = import.meta.env.MAIN_VITE_HARVEST_CLIENT_ID as string
const HARVEST_CLIENT_SECRET = import.meta.env.MAIN_VITE_HARVEST_CLIENT_SECRET as string
const HARVEST_REDIRECT_URI = `http://localhost:${OAUTH_PORT}/auth/harvest/callback`

const JIRA_CLIENT_ID = import.meta.env.MAIN_VITE_JIRA_CLIENT_ID as string
const JIRA_CLIENT_SECRET = import.meta.env.MAIN_VITE_JIRA_CLIENT_SECRET as string
const JIRA_REDIRECT_URI = `http://localhost:${OAUTH_PORT}/auth/jira/callback`
const JIRA_SCOPES = 'read:jira-user read:jira-work write:jira-work offline_access'

const SUCCESS_HTML = `<!DOCTYPE html><html><head><title>Jarvest Reminder</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb}
.card{text-align:center;padding:2rem;border-radius:1rem;background:white;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h2{color:#1558BC;margin:0 0 .5rem}p{color:#6b7280;margin:0}</style></head>
<body><div class="card"><h2>&#10003; Connected!</h2><p>You can close this tab and return to Jarvest Reminder.</p></div></body></html>`

const ERROR_HTML = (msg: string) =>
  `<!DOCTYPE html><html><head><title>Jarvest Reminder</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb}
.card{text-align:center;padding:2rem;border-radius:1rem;background:white;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h2{color:#ef4444;margin:0 0 .5rem}p{color:#6b7280;margin:0}</style></head>
<body><div class="card"><h2>Authorization failed</h2><p>${msg}</p></div></body></html>`

function waitForCallback(callbackPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith(callbackPath)) {
        res.writeHead(404).end()
        return
      }
      const url = new URL(req.url, `http://localhost:${OAUTH_PORT}`)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' }).end(ERROR_HTML(error))
        server.close()
        reject(new Error(`Authorization denied: ${error}`))
        return
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' }).end(SUCCESS_HTML)
        server.close()
        resolve(code)
      }
    })

    const timeout = setTimeout(() => {
      server.close()
      reject(new Error('Authorization timed out after 5 minutes'))
    }, 5 * 60 * 1000)

    server.on('close', () => clearTimeout(timeout))
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${OAUTH_PORT} is already in use. Please close other apps using it and try again.`))
      } else {
        reject(err)
      }
    })

    server.listen(OAUTH_PORT)
  })
}

// ── Harvest ──────────────────────────────────────────────────────────────────

export async function authorizeHarvest(): Promise<void> {
  const authUrl =
    `https://id.getharvest.com/oauth2/authorize` +
    `?client_id=${encodeURIComponent(HARVEST_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(HARVEST_REDIRECT_URI)}` +
    `&response_type=code`

  const callbackPromise = waitForCallback('/auth/harvest/callback')
  await shell.openExternal(authUrl)
  const code = await callbackPromise

  // Exchange code for tokens
  const tokenRes = await net.fetch('https://id.getharvest.com/api/v2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: HARVEST_CLIENT_ID,
      client_secret: HARVEST_CLIENT_SECRET,
      redirect_uri: HARVEST_REDIRECT_URI,
      grant_type: 'authorization_code'
    }).toString()
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    throw new Error(`Token exchange failed: ${tokenRes.status} ${body}`)
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  // Fetch account info
  const accountRes = await net.fetch('https://id.getharvest.com/api/v2/accounts', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'User-Agent': 'JarvestReminder'
    }
  })

  if (!accountRes.ok) throw new Error(`Failed to fetch Harvest accounts: ${accountRes.status}`)
  const accountData = await accountRes.json() as { accounts: { id: number; name: string }[] }
  const account = accountData.accounts[0]
  if (!account) throw new Error('No Harvest accounts found for this user')

  // Fetch user display name
  const meRes = await net.fetch('https://api.harvestapp.com/v2/users/me', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Harvest-Account-Id': String(account.id),
      'User-Agent': 'JarvestReminder'
    }
  })

  let userDisplayName = account.name
  if (meRes.ok) {
    const me = await meRes.json() as { first_name: string; last_name: string; email: string }
    userDisplayName = `${me.first_name} ${me.last_name}`.trim() || me.email
  }

  const config = getConfig()
  config.harvest.accessToken = tokens.access_token
  config.harvest.refreshToken = tokens.refresh_token
  config.harvest.tokenExpiresAt = Date.now() + tokens.expires_in * 1000
  config.harvest.accountId = String(account.id)
  config.harvest.userDisplayName = userDisplayName
  saveConfig(config)
}

export async function refreshHarvestToken(): Promise<void> {
  const config = getConfig()
  const res = await net.fetch('https://id.getharvest.com/api/v2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.harvest.refreshToken,
      client_id: HARVEST_CLIENT_ID,
      client_secret: HARVEST_CLIENT_SECRET
    }).toString()
  })

  if (!res.ok) throw new Error(`Harvest token refresh failed: ${res.status}`)

  const tokens = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  config.harvest.accessToken = tokens.access_token
  config.harvest.refreshToken = tokens.refresh_token
  config.harvest.tokenExpiresAt = Date.now() + tokens.expires_in * 1000
  saveConfig(config)
}

export function disconnectHarvest(): void {
  const config = getConfig()
  config.harvest.accessToken = ''
  config.harvest.refreshToken = ''
  config.harvest.tokenExpiresAt = 0
  config.harvest.accountId = ''
  config.harvest.userDisplayName = ''
  saveConfig(config)
}

// ── Jira ─────────────────────────────────────────────────────────────────────

export async function authorizeJira(): Promise<void> {
  const authUrl =
    `https://auth.atlassian.com/authorize` +
    `?audience=api.atlassian.com` +
    `&client_id=${encodeURIComponent(JIRA_CLIENT_ID)}` +
    `&scope=${encodeURIComponent(JIRA_SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(JIRA_REDIRECT_URI)}` +
    `&response_type=code` +
    `&prompt=consent`

  const callbackPromise = waitForCallback('/auth/jira/callback')
  await shell.openExternal(authUrl)
  const code = await callbackPromise

  // Exchange code for tokens
  const tokenRes = await net.fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: JIRA_CLIENT_ID,
      client_secret: JIRA_CLIENT_SECRET,
      code,
      redirect_uri: JIRA_REDIRECT_URI
    })
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    throw new Error(`Token exchange failed: ${tokenRes.status} ${body}`)
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  // Fetch accessible Jira sites
  const resourcesRes = await net.fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' }
  })

  if (!resourcesRes.ok) throw new Error(`Failed to fetch Jira sites: ${resourcesRes.status}`)
  const resources = await resourcesRes.json() as { id: string; url: string; name: string }[]
  const site = resources[0]
  if (!site) throw new Error('No accessible Jira sites found for this account')

  const domain = site.url.replace('https://', '').replace('.atlassian.net', '')

  // Fetch user display name
  const meRes = await net.fetch(`https://api.atlassian.com/ex/jira/${site.id}/rest/api/3/myself`, {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' }
  })

  let userDisplayName = site.name
  if (meRes.ok) {
    const me = await meRes.json() as { displayName: string; emailAddress: string }
    userDisplayName = me.displayName || me.emailAddress
  }

  const config = getConfig()
  config.jira.accessToken = tokens.access_token
  config.jira.refreshToken = tokens.refresh_token
  config.jira.tokenExpiresAt = Date.now() + tokens.expires_in * 1000
  config.jira.cloudId = site.id
  config.jira.domain = domain
  config.jira.userDisplayName = userDisplayName
  saveConfig(config)
}

export async function refreshJiraToken(): Promise<void> {
  const config = getConfig()
  const res = await net.fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: JIRA_CLIENT_ID,
      client_secret: JIRA_CLIENT_SECRET,
      refresh_token: config.jira.refreshToken
    })
  })

  if (!res.ok) throw new Error(`Jira token refresh failed: ${res.status}`)

  const tokens = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  config.jira.accessToken = tokens.access_token
  config.jira.refreshToken = tokens.refresh_token
  config.jira.tokenExpiresAt = Date.now() + tokens.expires_in * 1000
  saveConfig(config)
}

export function disconnectJira(): void {
  const config = getConfig()
  config.jira.accessToken = ''
  config.jira.refreshToken = ''
  config.jira.tokenExpiresAt = 0
  config.jira.cloudId = ''
  config.jira.domain = ''
  config.jira.userDisplayName = ''
  saveConfig(config)
}
