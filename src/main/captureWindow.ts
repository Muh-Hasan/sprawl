import { join } from 'node:path'
import { BrowserWindow, globalShortcut, screen, type WebContents } from 'electron'
import { CAPTURE_WINDOW } from '@shared/constants'
import type { CaptureMode } from '@shared/api'
import { TEXT_SIZE_ZOOM, toWindowPx, type TextSize } from '@shared/textSize'

/**
 * The quick-capture window (ARCHITECTURE §2, UI_SPEC §5c): created hidden at startup, so the
 * shortcut only has to show it (well under 200ms). Frameless, transparent, always on top and
 * off the taskbar; its own renderer entry (`capture.html`) shares the preload and the styles.
 */
export class CaptureWindow {
  private win: BrowserWindow | null = null
  /** The card's height in CSS px, as the renderer reported it. */
  private cardHeight: number = CAPTURE_WINDOW.minHeight

  constructor(
    private readonly options: {
      /** E2E mode: blurring doesn't hide it (the test window takes focus back and forth). */
      e2e: boolean
      defaultMode: () => CaptureMode
      /** The app text size: the page is zoomed by it and the window grows to match. */
      textSize: () => TextSize
      /** Runs once the page has loaded, just before each show (E2E: tell it the fixed clock). */
      beforeShow?: (contents: WebContents) => void
    },
  ) {}

  create(): BrowserWindow {
    if (this.win && !this.win.isDestroyed()) return this.win
    const { width, height } = this.size()
    const win = new BrowserWindow({
      width,
      height,
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
        zoomFactor: TEXT_SIZE_ZOOM[this.options.textSize()],
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

  /**
   * The window's size in device-independent px: the 520px card and its fitted height (112 to
   * 320 CSS px), both scaled by the text size so the zoomed card still fills the window.
   */
  private size(): { width: number; height: number } {
    const size = this.options.textSize()
    const css = Math.min(
      CAPTURE_WINDOW.maxHeight,
      Math.max(CAPTURE_WINDOW.minHeight, this.cardHeight),
    )
    return { width: toWindowPx(CAPTURE_WINDOW.width, size), height: toWindowPx(css, size) }
  }

  /** Centered on the monitor under the pointer, its top at 22% of that monitor's height. */
  private place(win: BrowserWindow): void {
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const { width, height } = this.size()
    win.setBounds({
      x: Math.round(workArea.x + (workArea.width - width) / 2),
      y: Math.round(workArea.y + workArea.height * CAPTURE_WINDOW.top),
      width,
      height,
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

  /** Fits the window to the card (`px` in CSS px), between 112 and 320px. */
  setHeight(px: number): void {
    this.cardHeight = px
    const win = this.win
    if (!win || win.isDestroyed()) return
    const { height } = this.size()
    const b = win.getBounds()
    if (b.height !== height) win.setBounds({ ...b, height })
  }

  /** Follows a new text size: zooms the page and resizes the window around its center. */
  applyTextSize(): void {
    const win = this.win
    if (!win || win.isDestroyed()) return
    win.webContents.setZoomFactor(TEXT_SIZE_ZOOM[this.options.textSize()])
    const { width, height } = this.size()
    const b = win.getBounds()
    win.setBounds({ x: Math.round(b.x + (b.width - width) / 2), y: b.y, width, height })
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
