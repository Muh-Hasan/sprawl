import { Menu, Tray } from 'electron'
import trayIcon from '../../resources/tray.ico?asset'

export interface TrayActions {
  open(): void
  capture(): void
  /** Pauses notifications for an hour, or resumes them. */
  togglePause(): void
  quit(): void
}

export interface TrayState {
  /** The capture shortcut, shown next to Quick capture. */
  shortcut: string | null
  paused: boolean
  overdue: number
}

/**
 * The tray icon (UI_SPEC §5d): "Sprawl" (plus " · 2 overdue") as the tooltip, a click opens the
 * window, and the menu has Open Sprawl · Quick capture · Pause notifications for 1 hour (or
 * Resume notifications) · Quit Sprawl. Not created in E2E mode.
 */
export class AppTray {
  private tray: Tray | null = null
  private state: TrayState = { shortcut: null, paused: false, overdue: 0 }

  constructor(private readonly actions: TrayActions) {}

  create(state: TrayState): void {
    if (this.tray) return
    this.tray = new Tray(trayIcon)
    this.tray.on('click', () => this.actions.open())
    this.state = state
    this.render()
  }

  update(state: Partial<TrayState>): void {
    const next = { ...this.state, ...state }
    const changed =
      next.shortcut !== this.state.shortcut ||
      next.paused !== this.state.paused ||
      next.overdue !== this.state.overdue
    this.state = next
    if (changed) this.render()
  }

  private render(): void {
    const tray = this.tray
    if (!tray) return
    const next = this.state
    tray.setToolTip(next.overdue > 0 ? `Sprawl · ${next.overdue} overdue` : 'Sprawl')
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Open Sprawl', click: () => this.actions.open() },
        {
          label: 'Quick capture',
          // Shown as a hint only: the global shortcut does the work.
          accelerator: next.shortcut ?? undefined,
          registerAccelerator: false,
          click: () => this.actions.capture(),
        },
        { type: 'separator' },
        {
          label: next.paused ? 'Resume notifications' : 'Pause notifications for 1 hour',
          click: () => this.actions.togglePause(),
        },
        { type: 'separator' },
        { label: 'Quit Sprawl', click: () => this.actions.quit() },
      ]),
    )
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
