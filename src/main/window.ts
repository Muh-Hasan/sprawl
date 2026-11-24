import { join } from 'node:path'
import { BrowserWindow, screen, shell } from 'electron'
import { APP_BG, TITLE_BAR_HEIGHT, TITLE_BAR_SYMBOL, WINDOW_MIN } from '@shared/constants'
import { isAllowedExternalUrl } from '@shared/schemas'
import icon from '../../resources/icon.ico?asset'
import type { WindowState } from './config'
import { initialBounds, trackWindowState } from './windowState'

export interface MainWindowOptions {
  /** The window state remembered in config.json. */
  saved: WindowState | null
  onStateChange: (state: WindowState) => void
}

/** Creates the main window with the settings from UI_SPEC §1 and the security rules from ARCHITECTURE §2. */
export function createMainWindow({ saved, onStateChange }: MainWindowOptions): BrowserWindow {
  const bounds = initialBounds(
    saved,
    screen.getAllDisplays().map((d) => d.workArea),
  )
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
    titleBarOverlay: { color: APP_BG, symbolColor: TITLE_BAR_SYMBOL, height: TITLE_BAR_HEIGHT },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  // Pinch never zooms the whole page: Electron disables visual zoom by default, so don't
  // call setVisualZoomLevelLimits. The canvas handles pinch itself (ctrl+wheel, phase 2).

  win.once('ready-to-show', () => {
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

/** Brings a window to the front: shows it, un-minimizes it and focuses it. */
export function focusWindow(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore()
  if (!win.isVisible()) win.show()
  win.focus()
}
