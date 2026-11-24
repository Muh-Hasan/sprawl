import { join } from 'node:path'
import { BrowserWindow, shell } from 'electron'
import { APP_BG, TITLE_BAR_HEIGHT, TITLE_BAR_SYMBOL } from '@shared/constants'
import icon from '../../resources/icon.png?asset'

/** Creates the main window with the settings from UI_SPEC §1 and the security rules from ARCHITECTURE §2. */
export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
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

  win.once('ready-to-show', () => win.show())

  // Never open new Electron windows from the renderer; external links go to the browser,
  // and only for the allowed schemes.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url)
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
