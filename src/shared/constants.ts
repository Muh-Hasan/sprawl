export const APP_NAME = 'Sprawl'

/** The Windows AppUserModelId of the packaged app (ARCHITECTURE §2). */
export const APP_USER_MODEL_ID = 'dev.sprawl.app'

/** The deep-link scheme: `sprawl://note/<id>`, `sprawl://list/due`. */
export const PROTOCOL = 'sprawl'

/** The database file inside a vault folder. */
export const VAULT_DB_FILE = 'sprawl.db'

/** The vault folder name inside Documents, used as the default (ARCHITECTURE §3). */
export const DEFAULT_VAULT_DIR = 'Sprawl'

/**
 * The app background (`--background` in globals.css). Only for places that can't read CSS
 * variables: BrowserWindow `backgroundColor`, `titleBarOverlay`, and Excalidraw's scene background.
 */
export const APP_BG = '#09090B'

/** `--muted-foreground`, for the native caption-button symbols in `titleBarOverlay`. */
export const TITLE_BAR_SYMBOL = '#A1A1AA'

/** Height of the title-bar strip in px (UI_SPEC §1). */
export const TITLE_BAR_HEIGHT = 40

/** Default and minimum main-window size (UI_SPEC §1). */
export const WINDOW_DEFAULT = { width: 1440, height: 900 } as const
export const WINDOW_MIN = { width: 960, height: 600 } as const

/** The user's note color tags (DESIGN_SYSTEM §2.3). `stone` is the default. */
export const NOTE_COLORS = ['stone', 'sand', 'sage', 'sky', 'lilac', 'rose'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

/**
 * "Remind me" options (PRODUCT §3.2): at the due time, 15 min or 1 hour before it, 09:00 on
 * the due day, or 09:00 the day before. One reminder per note.
 */
export const REMIND_OPTIONS = ['none', 'at', '15m', '1h', 'morning', '1d'] as const
export type RemindOption = (typeof REMIND_OPTIONS)[number]

/** The reminders that count back from the due time, so they need one. */
export const REMIND_NEEDS_TIME: ReadonlySet<RemindOption> = new Set(['at', '15m', '1h'])

/** Morning reminders ("Morning of", "1 day before") fire at this local time. */
export const MORNING_REMINDER_TIME = '09:00'

/** Note panel width in px (UI_SPEC §5): the default and the resize limits. */
export const PANEL_WIDTH = { default: 420, min: 320, max: 720 } as const

/** Autosave waits this long after the last change (PRODUCT §3.2). */
export const AUTOSAVE_MS = 500

/** How much of `body_text` a card gets for its preview (it shows at most four lines). */
export const PREVIEW_CHARS = 400

/** A new note card's size in world px (the canvas's NOTE_SIZE starts from it). */
export const NOTE_CARD = { w: 220, h: 64 } as const

/** The canvas snap grid in world px. */
export const SNAP_GRID = 8

/**
 * The quick-capture window (UI_SPEC §5c): 520px wide, its height fitted to the card, its top at
 * 22% of the monitor. Captured notes step this far down and right of the last one, over this
 * many places, so they don't stack exactly.
 */
export const CAPTURE_WINDOW = { width: 520, minHeight: 112, maxHeight: 320, top: 0.22 } as const
export const CAPTURE_STAGGER = { step: 24, places: 8 } as const

/** How long the "Saved to canvas" / "Logged" flash shows before the capture window hides. */
export const CAPTURE_FLASH_MS = 600

/** Toast titles are cut to this many characters (UI_SPEC §5d). */
export const TOAST_TITLE_MAX = 60

/** The rail's width in px (UI_SPEC §2): the canvas is the window minus this. */
export const RAIL_WIDTH = 52
