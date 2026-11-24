import type { SprawlAPI } from '@shared/api'

declare global {
  interface Window {
    sprawl: SprawlAPI
  }
}

export {}
