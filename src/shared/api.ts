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
  NoteCountQuery,
  NoteListCounts,
  NoteListQuery,
  NoteListRow,
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
  /** The List view's rows for a tab, its colors, a title filter and a sort (PRODUCT §3.3). */
  list(query: NoteListQuery): Promise<NoteListRow[]>
  /** How many notes each tab holds for a color and title filter (the List's tab counts). */
  listCounts(query: NoteCountQuery): Promise<NoteListCounts>
  /** How many open notes are overdue (the List badge and the tray tooltip). */
  overdueCount(): Promise<number>
  /** The sidebar's Pinned notes (live ones, done or not), in the order they were pinned. */
  pinned(): Promise<NoteListRow[]>
  /**
   * Gives a list-only note a card, centered on `at` (world), or on the middle of the last
   * canvas view. A note that already has one keeps it.
   */
  placeOnCanvas(id: string, at?: { x: number; y: number }): Promise<CanvasItem>
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
  /** Pins a note to the sidebar, at the end of the Pinned list, or unpins it. Not an edit. */
  setPinned(id: string, pinned: boolean): Promise<Note>
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
  /** How many days in a row have entries, ending on `day` (today: on yesterday until logged). */
  streak(day: string): Promise<number>
}

export type CaptureMode = 'note' | 'log'

/** The quick-capture window's API (PRODUCT §3.7); only that window uses it. */
export interface CaptureAPI {
  /** Saves a capture: a note on the canvas (with its `!date`), or a line in today's log. */
  submit(capture: { mode: CaptureMode; text: string }): Promise<{ ok: true; noteId?: string }>
  /** Hides the window without bringing the main window forward. */
  hide(): Promise<void>
  /** Fits the window to its card (clamped to 112–320px). */
  setHeight(px: number): Promise<void>
}

export type NotificationStatus = 'granted' | 'blocked'

/** Notifications, the global shortcut and the tray (PRODUCT §3.7–3.8). */
export interface SystemAPI {
  testNotification(): Promise<void>
  /** Whether Windows lets Sprawl show notifications (read from the registry). */
  notificationStatus(): Promise<NotificationStatus>
  /** Opens Windows' notification settings (`ms-settings:notifications`). */
  openNotificationSettings(): Promise<void>
  /** Registers a new capture shortcut and saves it, unless another app already has it. */
  setShortcut(accel: string): Promise<{ ok: boolean; conflict?: boolean }>
  /** Lets go of the capture shortcut while a new one is being recorded, then takes it back. */
  pauseShortcut(paused: boolean): Promise<void>
  /** Pauses notifications for `minutes` (0 resumes). */
  pauseNotifications(minutes: number): Promise<void>
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
  /** Notes or the log changed outside this window (a capture, a reminder), so views refetch. */
  'data:changed': undefined
  /** The capture window is being shown: reset for a new capture in `mode`. */
  'capture:show': { mode: CaptureMode }
}
export type MainEventName = keyof MainEvents

export interface SprawlAPI {
  app: AppAPI
  settings: SettingsAPI
  notes: NotesAPI
  canvas: CanvasAPI
  log: LogAPI
  capture: CaptureAPI
  system: SystemAPI
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
    list: 'notes:list',
    listCounts: 'notes:listCounts',
    overdueCount: 'notes:overdueCount',
    pinned: 'notes:pinned',
    placeOnCanvas: 'notes:placeOnCanvas',
    get: 'notes:get',
    create: 'notes:create',
    update: 'notes:update',
    duplicate: 'notes:duplicate',
    setDone: 'notes:setDone',
    setPinned: 'notes:setPinned',
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
    streak: 'log:streak',
  },
  capture: {
    submit: 'capture:submit',
    hide: 'capture:hide',
    setHeight: 'capture:setHeight',
  },
  system: {
    testNotification: 'system:testNotification',
    notificationStatus: 'system:notificationStatus',
    openNotificationSettings: 'system:openNotificationSettings',
    setShortcut: 'system:setShortcut',
    pauseShortcut: 'system:pauseShortcut',
    pauseNotifications: 'system:pauseNotifications',
  },
} as const

export const MAIN_EVENTS: readonly MainEventName[] = [
  'vault:changed',
  'nav:open-note',
  'nav:open-list-due',
  'app:before-close',
  'clock:changed',
  'data:changed',
  'capture:show',
]
