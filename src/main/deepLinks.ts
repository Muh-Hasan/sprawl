import { resolve } from 'node:path'
import { app, type BrowserWindow } from 'electron'
import { PROTOCOL } from '@shared/constants'
import { findDeepLink, type DeepLink } from '@shared/deepLink'
import { focusWindow } from './window'

/**
 * Registers Sprawl as the `sprawl://` handler (ARCHITECTURE §2), so clicking a toast (even an
 * old one in Action Center) opens Sprawl at the right note. The installer registers it as well
 * (phase 12). E2E runs never call this.
 *
 * `npm run dev` registers the dev build (electron.exe plus the app folder) so real toasts can
 * be clicked while testing; set `SPRAWL_NO_PROTOCOL=1` to leave your machine's handler alone.
 */
export function registerProtocol(): void {
  if (app.isPackaged) {
    if (!app.isDefaultProtocolClient(PROTOCOL)) app.setAsDefaultProtocolClient(PROTOCOL)
    return
  }
  if (process.env['SPRAWL_NO_PROTOCOL'] === '1') return
  const args = [resolve(app.getAppPath())]
  if (!app.isDefaultProtocolClient(PROTOCOL, process.execPath, args)) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, args)
  }
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
