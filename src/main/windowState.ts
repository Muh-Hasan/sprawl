import type { BrowserWindow } from 'electron'
import { WINDOW_DEFAULT, WINDOW_MIN } from '@shared/constants'
import type { WindowState } from './config'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** How much of the saved title bar must still be on a screen for the position to be reused. */
const MIN_VISIBLE = { width: 120, height: 40 }

function overlap(a: Rect, b: Rect): { width: number; height: number } {
  return {
    width: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
    height: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  }
}

/**
 * The bounds to open the window with. The saved size is kept (at least the minimum), and the
 * saved position only if part of the title bar lands on a current display; otherwise Electron
 * centers it (for example after unplugging the monitor it was on).
 */
export function initialBounds(
  saved: WindowState | null,
  workAreas: readonly Rect[],
): { width: number; height: number; x?: number; y?: number; maximized: boolean } {
  if (!saved) return { ...WINDOW_DEFAULT, maximized: false }
  const width = Math.max(saved.width, WINDOW_MIN.width)
  const height = Math.max(saved.height, WINDOW_MIN.height)
  const titleBar: Rect = { x: saved.x, y: saved.y, width, height: MIN_VISIBLE.height }
  const visible = workAreas.some((area) => {
    const o = overlap(titleBar, area)
    return o.width >= MIN_VISIBLE.width && o.height >= MIN_VISIBLE.height / 2
  })
  return visible
    ? { x: saved.x, y: saved.y, width, height, maximized: saved.maximized }
    : { width, height, maximized: saved.maximized }
}

/**
 * Saves the window's normal (un-maximized) bounds and maximized flag: debounced while moving
 * or resizing, and immediately on close.
 */
export function trackWindowState(win: BrowserWindow, save: (state: WindowState) => void): void {
  let timer: NodeJS.Timeout | null = null
  const snapshot = (): void => {
    if (timer) clearTimeout(timer)
    timer = null
    if (win.isDestroyed() || win.isMinimized()) return
    const b = win.getNormalBounds()
    save({
      x: Math.round(b.x),
      y: Math.round(b.y),
      width: Math.round(b.width),
      height: Math.round(b.height),
      maximized: win.isMaximized(),
    })
  }
  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(snapshot, 500)
  }
  win.on('resize', schedule)
  win.on('move', schedule)
  win.on('maximize', schedule)
  win.on('unmaximize', schedule)
  win.on('close', snapshot)
}
