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
