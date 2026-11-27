import { join } from 'node:path'
import { BrowserWindow, screen, shell } from 'electron'
import { APP_BG, TITLE_BAR_HEIGHT, TITLE_BAR_SYMBOL, WINDOW_MIN } from '@shared/constants'
import { isAllowedExternalUrl } from '@shared/schemas'
import { TEXT_SIZE_ZOOM, toWindowPx, type TextSize } from '@shared/textSize'
import { env } from './env'
import icon from '../../resources/icon.ico?asset'
import type { WindowState } from './config'
import { initialBounds, trackWindowState } from './windowState'

export interface MainWindowOptions {
  /** The window state remembered in config.json. */
  saved: WindowState | null
  onStateChange: (state: WindowState) => void
  /** Start hidden in the tray (`--hidden`, from start at login). */
  hidden?: boolean
  /** The app text size: the page's zoom factor. */
  textSize: TextSize
}

/** How much of an E2E window shows at the right edge of the screen; the rest hangs past it. */
export const E2E_VISIBLE_WIDTH = 360

/**
 * Where an E2E window opens: against the right edge of the primary screen with only a strip
 * showing, instead of centered over whatever you're working on while the tests run. Input,
 * screenshots and painting don't depend on where the window sits.
 */
export function e2ePosition(width: number): { x: number; y: number } {
  const area = screen.getPrimaryDisplay().workArea
  return { x: area.x + area.width - Math.min(width, E2E_VISIBLE_WIDTH), y: area.y }
}

/** Creates the main window with the settings from UI_SPEC §1 and the security rules from ARCHITECTURE §2. */
export function createMainWindow({
  saved,
  onStateChange,
  hidden = false,
  textSize,
}: MainWindowOptions): BrowserWindow {
  const restored = initialBounds(
    saved,
    screen.getAllDisplays().map((d) => d.workArea),
  )
  const bounds =
    env.e2e && restored.x === undefined ? { ...restored, ...e2ePosition(restored.width) } : restored
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: WINDOW_MIN.width,
    minHeight: WINDOW_MIN.height,
    show: false,
    title: 'Sprawl',
    icon,
    backgroundColor: APP_BG,
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarOverlay(textSize),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // E2E windows usually sit behind whatever you're doing. Throttled, they stop drawing
      // frames, so animation frames, ResizeObserver and animations stall and the canvas tests
      // flake. A real window is in front when it's used, so it keeps Chromium's default.
      backgroundThrottling: !env.e2e,
      zoomFactor: TEXT_SIZE_ZOOM[textSize],
    },
  })

  // Pinch never zooms the whole page: Electron disables visual zoom by default, so don't
  // call setVisualZoomLevelLimits. The canvas handles pinch itself (ctrl+wheel, phase 2).

  win.once('ready-to-show', () => {
    if (hidden) return
    if (bounds.maximized) win.maximize()
    win.show()
  })
  trackWindowState(win, onStateChange)

  // Never open new Electron windows from the renderer; external links go to the browser,
  // and only for the allowed schemes.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))

  return win
}

/**
 * The native caption buttons' strip. It's as tall as the zoomed 44px top bar, so the buttons
 * stay centered on it at every text size.
 */
function titleBarOverlay(size: TextSize): Electron.TitleBarOverlayOptions {
  return {
    color: APP_BG,
    symbolColor: TITLE_BAR_SYMBOL,
    height: toWindowPx(TITLE_BAR_HEIGHT, size),
  }
}

/** Follows a new text size: zooms the page and resizes the caption-button strip. */
export function applyTextSize(win: BrowserWindow, size: TextSize): void {
  win.webContents.setZoomFactor(TEXT_SIZE_ZOOM[size])
  win.setTitleBarOverlay(titleBarOverlay(size))
}

/** Brings a window to the front: shows it, un-minimizes it and focuses it. */
export function focusWindow(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore()
  if (!win.isVisible()) win.show()
  win.focus()
}
