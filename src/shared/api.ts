import type { SettingKey, Settings } from './schemas'
import type {
  CanvasApplyResult,
  CanvasItem,
  CanvasOp,
  LogDay,
  LogEntry,
  LogEntryPatch,
  NewNote,
  Note,
  NoteLink,
  NoteLinkPatch,
  NotePatch,
  NoteSummary,
} from './types'

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
  /**
   * The answer to `app:before-close`: everything pending is saved, so the window can close.
   * Main closes it anyway after a short timeout.
   */
  readyToClose(): Promise<void>
}

export interface SettingsAPI {
  getAll(): Promise<Settings>
  get<K extends SettingKey>(key: K): Promise<Settings[K]>
  set<K extends SettingKey>(key: K, value: Settings[K]): Promise<void>
}

export interface NotesAPI {
  get(id: string): Promise<Note>
  /** A note with no card (the canvas creates notes through `canvas.apply` instead). */
  create(note: NewNote): Promise<Note>
  update(id: string, patch: NotePatch): Promise<Note>
  /** A copy of the title, body, color and links, not placed on the canvas (PRODUCT §3.1). */
  duplicate(id: string): Promise<Note>
  /**
   * Marks a note done (with a log entry) or not done (removing it), in one transaction. Notes on
   * the canvas use the undoable `setDone` canvas op instead.
   */
  setDone(id: string, done: boolean): Promise<Note>
  /** Soft delete; purged for good after 30 days. */
  remove(id: string): Promise<void>
  restore(id: string): Promise<void>
  /** The note's external links (`note_links`), kept in `position` order. */
  links: NoteLinksAPI
}

export interface NoteLinksAPI {
  /** Adds a link at the end of the list. */
  add(noteId: string, url: string, label: string | null): Promise<NoteLink>
  update(id: string, patch: NoteLinkPatch): Promise<NoteLink>
  remove(id: string): Promise<void>
  /** `ids` must list every link of the note, in the new order. */
  reorder(noteId: string, ids: string[]): Promise<NoteLink[]>
}

export interface CanvasAPI {
  /** Every card on the canvas, with its note's card fields for note cards. */
  load(): Promise<CanvasItem[]>
  /** Runs a batch of ops in one transaction (ARCHITECTURE §5). */
  apply(ops: CanvasOp[]): Promise<CanvasApplyResult>
}

export interface LogAPI {
  /** A day's entries (`YYYY-MM-DD`), in time order. */
  day(day: string): Promise<LogDay>
  /** A manual entry; `at` defaults to now (or the current time of day on another day). */
  addManual(day: string, text: string, at?: number): Promise<LogEntry>
  /** Edits a manual entry's text, or its time (`HH:mm`) on the same day. */
  update(id: string, patch: LogEntryPatch): Promise<LogEntry>
  /** Deletes a manual entry. */
  remove(id: string): Promise<void>
  /** The days of a month (`YYYY-MM`) that have entries. */
  daysWithEntries(month: string): Promise<string[]>
  /** Notes edited the day before `day` and not done by its end. */
  carriedOver(day: string): Promise<NoteSummary[]>
}

/** Events main sends to the renderer, with their payloads. */
export interface MainEvents {
  'vault:changed': VaultInfo
  'nav:open-note': { id: string }
  'nav:open-list-due': undefined
  /** The window is closing: save what's pending, then call `app.readyToClose()`. */
  'app:before-close': undefined
  /** E2E only: the clock was fixed at `now` (or runs again with null), so "today" follows it. */
  'clock:changed': { now: number | null }
}
export type MainEventName = keyof MainEvents

export interface SprawlAPI {
  app: AppAPI
  settings: SettingsAPI
  notes: NotesAPI
  canvas: CanvasAPI
  log: LogAPI
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
    readyToClose: 'app:readyToClose',
  },
  settings: {
    getAll: 'settings:getAll',
    get: 'settings:get',
    set: 'settings:set',
  },
  notes: {
    get: 'notes:get',
    create: 'notes:create',
    update: 'notes:update',
    duplicate: 'notes:duplicate',
    setDone: 'notes:setDone',
    remove: 'notes:remove',
    restore: 'notes:restore',
    links: {
      add: 'notes:links:add',
      update: 'notes:links:update',
      remove: 'notes:links:remove',
      reorder: 'notes:links:reorder',
    },
  },
  canvas: {
    load: 'canvas:load',
    apply: 'canvas:apply',
  },
  log: {
    day: 'log:day',
    addManual: 'log:addManual',
    update: 'log:update',
    remove: 'log:remove',
    daysWithEntries: 'log:daysWithEntries',
    carriedOver: 'log:carriedOver',
  },
} as const

export const MAIN_EVENTS: readonly MainEventName[] = [
  'vault:changed',
  'nav:open-note',
  'nav:open-list-due',
  'app:before-close',
  'clock:changed',
]
