import { join } from 'node:path'
import { app, BrowserWindow, Menu } from 'electron'
import { APP_USER_MODEL_ID } from '@shared/constants'
import { guardClose, readyToClose } from './closeGuard'
import { ConfigStore } from './config'
import { registerProtocol, routeArgv } from './deepLinks'
import { env } from './env'
import { broadcast, registerIpc } from './ipc/register'
import { registerTestHooks } from './ipc/testHooks'
import { CanvasService } from './services/canvas'
import { Clock } from './services/clock'
import { LogService } from './services/log'
import { NotesService, purgeDeleted } from './services/notes'
import { SettingsService } from './services/settings'
import { VaultService } from './services/vault'
import { createMainWindow, focusWindow } from './window'

// Must happen before anything else: userData also keys the single-instance lock, so tests
// (and a second profile) never collide with your own running copy.
if (env.userData) app.setPath('userData', env.userData)

// A second launch (or a toast's protocol activation) hands its argv to the first instance
// through `second-instance` and exits.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  start()
}

function start(): void {
  // Windows needs an AppUserModelId for toasts. The installer's Start-menu shortcut carries
  // the same ID; unpackaged, Windows only shows toasts for the exe path (ARCHITECTURE §2).
  app.setAppUserModelId(app.isPackaged ? APP_USER_MODEL_ID : process.execPath)

  // No application menu: Electron's default one would steal Ctrl+0 / Ctrl+= / Ctrl+- (page zoom),
  // Ctrl+R (reload) and Ctrl+Shift+I (devtools). See ARCHITECTURE §2.
  Menu.setApplicationMenu(null)

  if (!env.e2e) registerProtocol()

  let mainWindow: BrowserWindow | null = null

  app.on('second-instance', (_event, argv) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    focusWindow(mainWindow)
    routeArgv(mainWindow, argv)
  })

  void app.whenReady().then(() => {
    const clock = new Clock()
    const now = (): number => clock.now()
    const config = new ConfigStore(join(app.getPath('userData'), 'config.json'))
    const vault = new VaultService({
      config,
      documentsDir: app.getPath('documents'),
      envVault: env.vault,
      // On launch and on every vault switch (ARCHITECTURE §4).
      onOpen: (handle) => void purgeDeleted(handle, now()),
    })
    vault.restore()
    const settings = new SettingsService({ config, db: () => vault.db() })
    const notes = new NotesService({ db: () => vault.db(), now })
    const canvas = new CanvasService({ db: () => vault.db(), now })
    const log = new LogService({ db: () => vault.db(), now })
    registerIpc({ vault, settings, notes, canvas, log, onReadyToClose: readyToClose })
    if (env.e2e) {
      registerTestHooks({
        setNow: (ms) => {
          clock.set(ms)
          broadcast('clock:changed', { now: ms })
        },
      })
    }

    const openWindow = (): BrowserWindow => {
      const win = createMainWindow({
        saved: config.get().window,
        onStateChange: (state) => config.update((c) => void (c.window = state)),
      })
      guardClose(win)
      win.on('closed', () => {
        if (mainWindow === win) mainWindow = null
      })
      return win
    }
    mainWindow = openWindow()
    routeArgv(mainWindow, process.argv)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = openWindow()
    })
    app.on('will-quit', () => vault.close())
  })

  // later: phase-6 hides to the tray instead when "keep running" is on.
  app.on('window-all-closed', () => {
    app.quit()
  })
}
