/// <reference types="vite/client" />

import { JarvestApi } from '../preload/index'

declare global {
  interface Window {
    jarvest: JarvestApi
  }
}
