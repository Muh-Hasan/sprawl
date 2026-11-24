import { contextBridge } from 'electron'
import type { SprawlAPI } from '@shared/api'

/**
 * The typed bridge (ARCHITECTURE §5). The renderer only ever sees `window.sprawl`.
 * Namespaces are added phase by phase.
 */
const api: SprawlAPI = {}

contextBridge.exposeInMainWorld('sprawl', api)
