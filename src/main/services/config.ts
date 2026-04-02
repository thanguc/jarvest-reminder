import Store from 'electron-store'
import { AppConfig, DEFAULT_CONFIG } from '../../shared/types'

interface StoreSchema {
  config: AppConfig
  availableUpdateVersion: string | null
  previousVersion: string | null
}

const store = new Store<StoreSchema>({
  defaults: {
    config: DEFAULT_CONFIG,
    availableUpdateVersion: null,
    previousVersion: null
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
    config.jira.accessToken &&
    config.jira.cloudId &&
    config.harvest.accessToken &&
    config.harvest.accountId
  )
}

export function getAvailableUpdateVersion(): string | null {
  return store.get('availableUpdateVersion')
}

export function setAvailableUpdateVersion(version: string | null): void {
  store.set('availableUpdateVersion', version)
}

export function getPreviousVersion(): string | null {
  return store.get('previousVersion')
}

export function setPreviousVersion(version: string | null): void {
  store.set('previousVersion', version)
}
