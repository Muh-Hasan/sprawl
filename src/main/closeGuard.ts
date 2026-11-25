import type { BrowserWindow, WebContents } from 'electron'

/** How long a closing window waits for its renderer to save before it closes anyway. */
export const CLOSE_TIMEOUT_MS = 2000

const ready = new WeakMap<WebContents, () => void>()

/**
 * Makes a window save before it closes (ARCHITECTURE §6, "nothing is ever lost"): the first
 * close is held, the renderer gets `app:before-close`, flushes its pending writes and answers
 * with `app.readyToClose()`; then the window really closes. A renderer that doesn't answer
 * (still loading, hung or crashed) gets `CLOSE_TIMEOUT_MS`.
 */
export function guardClose(win: BrowserWindow, timeoutMs = CLOSE_TIMEOUT_MS): void {
  let released = false
  let waiting = false
  const contents = win.webContents

  const release = (): void => {
    if (released) return
    released = true
    ready.delete(contents)
    if (!win.isDestroyed()) win.close()
  }

  win.on('close', (event) => {
    if (released) return
    event.preventDefault()
    if (waiting) return
    waiting = true
    ready.set(contents, release)
    setTimeout(release, timeoutMs)
    contents.send('app:before-close')
  })
}

/** The renderer of `sender` has saved everything; let its window close. */
export function readyToClose(sender: WebContents): void {
  ready.get(sender)?.()
}
