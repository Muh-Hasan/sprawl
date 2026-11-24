import type { SettingKey, Settings } from './schemas'
import type { CanvasApplyResult, CanvasItem, CanvasOp } from './types'

/**
 * The `window.sprawl` API shared by preload and renderer (ARCHITECTURE §5). Every method is an
 * `ipcRenderer.invoke`, so it returns a promise. Namespaces are added phase by phase.
 */

export interface VaultInfo {
  /** The open vault folder, or null before onboarding. */
  path: string | null
  /** The suggested folder for onboarding: Documents\Sprawl. */
  defaultPath: string
}

export interface AppAPI {
  getVaultInfo(): Promise<VaultInfo>
  /** Shows the native folder picker. Resolves to the chosen folder, or null if cancelled. */
  pickVaultFolder(): Promise<string | null>
  /** Opens (or creates) the vault in `path`, remembers it, and emits `vault:changed`. */
  openVault(path: string): Promise<VaultInfo>
  /** Opens an http, https or mailto URL in the system browser. */
  openExternal(url: string): Promise<void>
}

export interface SettingsAPI {
  getAll(): Promise<Settings>
  get<K extends SettingKey>(key: K): Promise<Settings[K]>
  set<K extends SettingKey>(key: K, value: Settings[K]): Promise<void>
}

export interface CanvasAPI {
  /** Every card on the canvas, with its note's card fields for note cards. */
  load(): Promise<CanvasItem[]>
  /** Runs a batch of ops in one transaction (ARCHITECTURE §5). */
  apply(ops: CanvasOp[]): Promise<CanvasApplyResult>
}

/** Events main sends to the renderer, with their payloads. */
export interface MainEvents {
  'vault:changed': VaultInfo
  'nav:open-note': { id: string }
  'nav:open-list-due': undefined
}
export type MainEventName = keyof MainEvents

export interface SprawlAPI {
  app: AppAPI
  settings: SettingsAPI
  canvas: CanvasAPI
  /** Subscribes to a main-process event. Returns the unsubscribe function. */
  on<E extends MainEventName>(event: E, listener: (payload: MainEvents[E]) => void): () => void
}

/** IPC channel names, one per API method. */
export const IPC = {
  app: {
    getVaultInfo: 'app:getVaultInfo',
    pickVaultFolder: 'app:pickVaultFolder',
    openVault: 'app:openVault',
    openExternal: 'app:openExternal',
  },
  settings: {
    getAll: 'settings:getAll',
    get: 'settings:get',
    set: 'settings:set',
  },
  canvas: {
    load: 'canvas:load',
    apply: 'canvas:apply',
  },
} as const

export const MAIN_EVENTS: readonly MainEventName[] = [
  'vault:changed',
  'nav:open-note',
  'nav:open-list-due',
]
