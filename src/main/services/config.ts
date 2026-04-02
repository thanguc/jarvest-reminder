import Store from 'electron-store'
import { AppConfig, DEFAULT_CONFIG } from '../../shared/types'

const store = new Store<{ config: AppConfig }>({
  defaults: {
    config: DEFAULT_CONFIG
  }
})

export function getConfig(): AppConfig {
  return store.get('config')
}

export function saveConfig(config: AppConfig): void {
  store.set('config', config)
}

export function isConfigured(): boolean {
  const config = getConfig()
  return !!(
    config.jira.email &&
    config.jira.apiToken &&
    config.jira.domain &&
    config.harvest.accessToken &&
    config.harvest.accountId
  )
}
