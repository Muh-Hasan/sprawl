import { join } from 'node:path'
import { app, Menu, powerMonitor, shell, type BrowserWindow } from 'electron'
import { APP_USER_MODEL_ID, RAIL_WIDTH, WINDOW_DEFAULT } from '@shared/constants'
import { parseDeepLink } from '@shared/deepLink'
import { CaptureShortcut, CaptureWindow } from './captureWindow'
import { guardClose, readyToClose } from './closeGuard'
import { ConfigStore } from './config'
import { registerProtocol, routeArgv, routeDeepLink } from './deepLinks'
import { env } from './env'
import { broadcast, registerIpc } from './ipc/register'
import { registerTestHooks } from './ipc/testHooks'
import { CanvasService } from './services/canvas'
import { CaptureService, viewCenterOf } from './services/capture'
import { Clock } from './services/clock'
import { LogService } from './services/log'
import { NotesService, purgeDeleted } from './services/notes'
import { notificationStatus, RecordingNotifier, WindowsNotifier } from './services/notify'
import { ReminderScheduler } from './services/reminders'
import { SettingsService } from './services/settings'
import { VaultService } from './services/vault'
import { AppTray, type TrayState } from './tray'
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
  const appId = app.isPackaged ? APP_USER_MODEL_ID : process.execPath
  app.setAppUserModelId(appId)

  // No application menu: Electron's default one would steal Ctrl+0 / Ctrl+= / Ctrl+- (page zoom),
  // Ctrl+R (reload) and Ctrl+Shift+I (devtools). See ARCHITECTURE §2.
  Menu.setApplicationMenu(null)

  if (!env.e2e) registerProtocol()

  let mainWindow: BrowserWindow | null = null
  /** Set once Sprawl is really quitting, so closing the window no longer hides it to the tray. */
  let quitting = false
  const quit = (): void => {
    quitting = true
    app.quit()
  }
  app.on('before-quit', () => void (quitting = true))

  const route = (url: string): void => {
    const link = parseDeepLink(url)
    if (link && mainWindow && !mainWindow.isDestroyed()) routeDeepLink(mainWindow, link)
  }

  app.on('second-instance', (_event, argv) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    focusWindow(mainWindow)
    routeArgv(mainWindow, argv)
  })

  void app.whenReady().then(() => {
    const clock = new Clock()
    const now = (): number => clock.now()
    const config = new ConfigStore(join(app.getPath('userData'), 'config.json'))
    let scheduler: ReminderScheduler | null = null
    const vault = new VaultService({
      config,
      documentsDir: app.getPath('documents'),
      envVault: env.vault,
      // On launch and on every vault switch (ARCHITECTURE §4).
      onOpen: (handle) => {
        purgeDeleted(handle, now())
        scheduler?.vaultChanged()
      },
    })
    vault.restore()
    const db = (): ReturnType<VaultService['db']> => vault.db()
    const settings: SettingsService = new SettingsService({
      config,
      db,
      onChange: (key) => followSetting(key),
    })
    const notes = new NotesService({ db, now })
    const canvas = new CanvasService({ db, now })
    const log = new LogService({ db, now })

    // Toasts are recorded in E2E mode (ARCHITECTURE §10.3), never shown.
    const recorder = env.e2e ? new RecordingNotifier() : null
    const notifier = recorder ?? new WindowsNotifier(route)

    // tray ---------------------------------------------------------------------------------
    const pausedNow = (): boolean => (settings.get('notificationsPausedUntil') ?? 0) > now()
    const pauseNotifications = (minutes: number): void =>
      settings.set('notificationsPausedUntil', minutes === 0 ? null : now() + minutes * 60_000)
    const tray = env.e2e
      ? null
      : new AppTray({
          open: () => mainWindow && focusWindow(mainWindow),
          capture: () => captureWindow.show(),
          togglePause: () => pauseNotifications(pausedNow() ? 0 : 60),
          quit,
        })
    let trayState: TrayState = { shortcut: null, paused: false, overdue: 0 }
    const refreshTray = (): void => {
      if (!vault.db()) return
      trayState = {
        shortcut: shortcut.accelerator,
        paused: pausedNow(),
        overdue: notes.overdueCount(),
      }
      tray?.update(trayState)
    }

    scheduler = new ReminderScheduler({ db, now, notifier, settings, afterCheck: refreshTray })

    // quick capture ------------------------------------------------------------------------
    const captureWindow = new CaptureWindow({
      e2e: env.e2e,
      defaultMode: () => settings.get('captureDefaultMode'),
      // A capture window that loaded after a test fixed the clock hasn't heard of it yet.
      beforeShow: env.e2e
        ? (contents) => contents.send('clock:changed', { now: clock.fixedAt })
        : undefined,
    })
    const shortcut = new CaptureShortcut(() => captureWindow.show(), !env.e2e)
    const viewCenter = (): { x: number; y: number } => {
      const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
      const [width, height] = win?.getContentSize() ?? [WINDOW_DEFAULT.width, WINDOW_DEFAULT.height]
      return viewCenterOf(settings.get('viewport'), {
        width: Math.max(0, (width ?? 0) - RAIL_WIDTH),
        height: height ?? 0,
      })
    }
    const capture = new CaptureService({ db, now, canvas, log, settings, viewCenter })

    // system -------------------------------------------------------------------------------
    /** Start at login, hidden in the tray (ARCHITECTURE §2). Never from E2E runs. */
    const syncLoginItem = (): void => {
      if (env.e2e) return
      // Unpackaged, Electron needs the app folder; that starts the last `npm run build`.
      const args = app.isPackaged ? ['--hidden'] : [app.getAppPath(), '--hidden']
      app.setLoginItemSettings({
        openAtLogin: settings.get('openAtLogin'),
        path: process.execPath,
        args,
      })
    }

    function followSetting(key: string): void {
      if (key === 'remindersOn' || key === 'morningSummary' || key === 'notificationsPausedUntil')
        scheduler?.check()
      if (key === 'captureShortcut') {
        shortcut.set(settings.get('captureShortcut'))
        refreshTray()
      }
      if (key === 'openAtLogin') syncLoginItem()
    }

    registerIpc({
      vault,
      settings,
      notes,
      canvas,
      log,
      onReadyToClose: readyToClose,
      capture,
      isCaptureWindow: (sender) => sender === captureWindow.webContents,
      hideCapture: () => captureWindow.hide(),
      setCaptureHeight: (px) => captureWindow.setHeight(px),
      viewCenter,
      afterWrite: () => scheduler?.check(),
      system: {
        testNotification: () =>
          notifier.show({
            title: 'Sprawl',
            body: 'Notifications are working. Reminders will look like this.',
            link: 'sprawl://list/due',
          }),
        notificationStatus: () =>
          env.e2e ? Promise.resolve('granted') : notificationStatus(appId),
        openNotificationSettings: () => shell.openExternal('ms-settings:notifications'),
        setShortcut: (accel) => {
          if (!shortcut.set(accel)) return { ok: false, conflict: true }
          settings.set('captureShortcut', accel)
          return { ok: true }
        },
        pauseShortcut: (paused) => shortcut.pause(paused),
        pauseNotifications,
      },
    })

    if (env.e2e) {
      registerTestHooks({
        setNow: (ms) => {
          clock.set(ms)
          broadcast('clock:changed', { now: ms })
          scheduler?.check()
        },
        notifications: () => recorder?.shown ?? [],
        triggerCapture: () => captureWindow.show(),
        openLink: route,
        checkReminders: () => scheduler?.check(),
        trayState: () => trayState,
        captureVisible: () => captureWindow.isVisible(),
      })
    }

    // windows ------------------------------------------------------------------------------
    /** Started at login: stay in the tray until opened (only where there is a tray). */
    const hidden = process.argv.includes('--hidden') && tray !== null
    const openWindow = (): BrowserWindow => {
      const win = createMainWindow({
        saved: config.get().window,
        onStateChange: (state) => config.update((c) => void (c.window = state)),
        hidden,
      })
      guardClose(win, {
        // "Keep Sprawl running in the background": closing hides to the tray. Off in E2E.
        hideInstead: () => !quitting && !env.e2e && settings.get('keepInTray'),
      })
      win.on('closed', () => {
        if (mainWindow === win) mainWindow = null
        // The capture window would otherwise keep a closed Sprawl running.
        quit()
      })
      // Created once the main window has painted (so it never slows the first paint), which
      // also keeps it the app's second window. `ready-to-show` fires for a hidden start too.
      win.once('ready-to-show', () => setImmediate(() => captureWindow.create()))
      return win
    }
    mainWindow = openWindow()
    routeArgv(mainWindow, process.argv)

    tray?.create(trayState)
    shortcut.set(settings.get('captureShortcut'))
    syncLoginItem()
    scheduler.start()
    // Timers stop while the PC sleeps (ARCHITECTURE §2).
    powerMonitor.on('resume', () => scheduler?.check())
    powerMonitor.on('unlock-screen', () => scheduler?.check())

    app.on('will-quit', () => {
      scheduler?.stop()
      shortcut.dispose()
      tray?.destroy()
      captureWindow.destroy()
      vault.close()
    })
  })

  app.on('window-all-closed', () => quit())
}
