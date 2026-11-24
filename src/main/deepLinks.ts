import { app, type BrowserWindow } from 'electron'
import { PROTOCOL } from '@shared/constants'
import { findDeepLink, type DeepLink } from '@shared/deepLink'
import { focusWindow } from './window'

/**
 * Registers Sprawl as the `sprawl://` handler (ARCHITECTURE §2). Only the packaged app does
 * this, so `npm run dev` and the E2E runs never point your machine's handler at a dev build.
 * The installer registers it as well (phase 12).
 * later: phase-6 may also register in dev, to click real toasts while testing reminders.
 */
export function registerProtocol(): void {
  if (!app.isPackaged) return
  if (!app.isDefaultProtocolClient(PROTOCOL)) app.setAsDefaultProtocolClient(PROTOCOL)
}

/**
 * Routes a deep link to the renderer: focuses the window and sends the matching `nav:*` event
 * once the page has loaded. The renderer handles them from their phase on (note panel: phase 4,
 * List view's Due tab: phase 6); until then they're no-ops.
 */
export function routeDeepLink(win: BrowserWindow, link: DeepLink): void {
  focusWindow(win)
  const send = (): void => {
    if (link.type === 'open-note') win.webContents.send('nav:open-note', { id: link.id })
    else win.webContents.send('nav:open-list-due', undefined)
  }
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send)
  else send()
}

/** Routes the deep link in a process argv, if there is one. */
export function routeArgv(win: BrowserWindow, argv: readonly string[]): void {
  const link = findDeepLink(argv)
  if (link) routeDeepLink(win, link)
}
