import { join } from 'node:path'
import { BrowserWindow, globalShortcut, screen, type WebContents } from 'electron'
import { CAPTURE_WINDOW } from '@shared/constants'
import type { CaptureMode } from '@shared/api'

/**
 * The quick-capture window (ARCHITECTURE §2, UI_SPEC §5c): created hidden at startup, so the
 * shortcut only has to show it (well under 200ms). Frameless, transparent, always on top and
 * off the taskbar; its own renderer entry (`capture.html`) shares the preload and the styles.
 */
export class CaptureWindow {
  private win: BrowserWindow | null = null
  private height: number = CAPTURE_WINDOW.minHeight

  constructor(
    private readonly options: {
      /** E2E mode: blurring doesn't hide it (the test window takes focus back and forth). */
      e2e: boolean
      defaultMode: () => CaptureMode
      /** Runs once the page has loaded, just before each show (E2E: tell it the fixed clock). */
      beforeShow?: (contents: WebContents) => void
    },
  ) {}

  create(): BrowserWindow {
    if (this.win && !this.win.isDestroyed()) return this.win
    const win = new BrowserWindow({
      width: CAPTURE_WINDOW.width,
      height: this.height,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      maximizable: false,
      minimizable: true,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      title: 'Sprawl quick capture',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
        backgroundThrottling: false,
      },
    })
    // Above full-screen apps too.
    win.setAlwaysOnTop(true, 'screen-saver')
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (event) => event.preventDefault())
    if (!this.options.e2e) win.on('blur', () => this.hide())
    win.on('closed', () => {
      if (this.win === win) this.win = null
    })
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (devUrl) void win.loadURL(`${devUrl}/capture.html`)
    else void win.loadFile(join(__dirname, '../renderer/capture.html'))
    this.win = win
    return win
  }

  get webContents(): WebContents | null {
    return this.win && !this.win.isDestroyed() ? this.win.webContents : null
  }

  isVisible(): boolean {
    return this.win !== null && !this.win.isDestroyed() && this.win.isVisible()
  }

  /** Centered on the monitor under the pointer, its top at 22% of that monitor's height. */
  private place(win: BrowserWindow): void {
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    win.setBounds({
      x: Math.round(workArea.x + (workArea.width - CAPTURE_WINDOW.width) / 2),
      y: Math.round(workArea.y + workArea.height * CAPTURE_WINDOW.top),
      width: CAPTURE_WINDOW.width,
      height: this.height,
    })
  }

  show(): void {
    const win = this.create()
    const contents = win.webContents
    const reveal = (): void => {
      this.options.beforeShow?.(contents)
      contents.send('capture:show', { mode: this.options.defaultMode() })
      if (win.isMinimized()) win.restore()
      this.place(win)
      win.setOpacity(1)
      win.show()
      win.focus()
      contents.focus()
    }
    if (contents.isLoading()) contents.once('did-finish-load', reveal)
    else reveal()
  }

  /**
   * Hides without bringing the main window forward: when a focused window hides, Windows hands
   * focus to the app's next window, so it's minimized first (focus goes back to the app the user
   * was in), made invisible so the minimize doesn't animate, then hidden (ARCHITECTURE §2).
   */
  hide(): void {
    const win = this.win
    if (!win || win.isDestroyed() || !win.isVisible()) return
    win.setOpacity(0)
    win.minimize()
    win.hide()
  }

  /** Fits the window to the card, between 112 and 320px. */
  setHeight(px: number): void {
    this.height = Math.min(CAPTURE_WINDOW.maxHeight, Math.max(CAPTURE_WINDOW.minHeight, px))
    const win = this.win
    if (!win || win.isDestroyed()) return
    const b = win.getBounds()
    if (b.height !== this.height) win.setBounds({ ...b, height: this.height })
  }

  destroy(): void {
    if (this.win && !this.win.isDestroyed()) this.win.destroy()
    this.win = null
  }
}

/**
 * The global capture shortcut (PRODUCT §3.7). Registering fails when another app already has
 * the combo; then the old one is kept and the caller shows "Already used by another app".
 */
export class CaptureShortcut {
  private current: string | null = null
  private paused = false

  constructor(
    private readonly onPress: () => void,
    /** Off in E2E: tests never press real global shortcuts (ARCHITECTURE §10.3). */
    private readonly enabled: boolean,
  ) {}

  get accelerator(): string | null {
    return this.current
  }

  private register(accel: string): boolean {
    if (!this.enabled) return true
    try {
      return globalShortcut.register(accel, this.onPress)
    } catch {
      return false
    }
  }

  private unregister(accel: string): void {
    if (this.enabled && globalShortcut.isRegistered(accel)) globalShortcut.unregister(accel)
  }

  /**
   * Switches to `accel` (and ends a pause). Returns false, keeping the old one, if it can't be
   * registered.
   */
  set(accel: string): boolean {
    if (accel === this.current && !this.paused) return true
    const previous = this.current
    if (previous && !this.paused) this.unregister(previous)
    this.paused = false
    if (this.register(accel)) {
      this.current = accel
      return true
    }
    if (previous) this.register(previous)
    return false
  }

  /** Lets go of the shortcut while a new one is recorded, so pressing it doesn't open capture. */
  pause(paused: boolean): void {
    if (paused === this.paused) return
    this.paused = paused
    if (!this.current) return
    if (paused) this.unregister(this.current)
    else this.register(this.current)
  }

  dispose(): void {
    if (this.enabled) globalShortcut.unregisterAll()
    this.current = null
  }
}
