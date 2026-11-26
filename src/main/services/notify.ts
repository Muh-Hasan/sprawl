import { execFile } from 'node:child_process'
import { Notification } from 'electron'
import { TOAST_TITLE_MAX } from '@shared/constants'
import type { NotificationStatus } from '@shared/api'

/**
 * Native Windows toasts (ARCHITECTURE §2, UI_SPEC §5d). Each one carries a `sprawl://` deep link
 * as its protocol-activation `launch` argument, so clicking it opens the right place even from
 * Action Center after Sprawl has restarted. In E2E mode toasts are recorded, never shown.
 */

export interface Toast {
  title: string
  body: string
  /** `sprawl://note/<id>` or `sprawl://list/due`. */
  link: string
  /** The morning summary is silent; reminders use the default sound. */
  silent?: boolean
}

export interface Notifier {
  show(toast: Toast): void
}

/** Cuts a toast title to 60 characters (UI_SPEC §5d). */
export function toastTitle(title: string): string {
  const t = title.trim() || 'Untitled note'
  return t.length <= TOAST_TITLE_MAX ? t : `${t.slice(0, TOAST_TITLE_MAX - 1).trimEnd()}…`
}

function xmlEscape(text: string): string {
  return text.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  )
}

/** The toast as Windows' XML: protocol activation with the deep link, and the sound choice. */
export function toastXml({ title, body, link, silent = false }: Toast): string {
  return [
    `<toast launch="${xmlEscape(link)}" activationType="protocol">`,
    '<visual><binding template="ToastGeneric">',
    `<text>${xmlEscape(toastTitle(title))}</text>`,
    `<text>${xmlEscape(body)}</text>`,
    '</binding></visual>',
    silent ? '<audio silent="true"/>' : '',
    '</toast>',
  ].join('')
}

/** E2E mode: keeps what would have been shown (`test:notifications`). */
export class RecordingNotifier implements Notifier {
  readonly shown: Toast[] = []
  show(toast: Toast): void {
    this.shown.push({ ...toast, title: toastTitle(toast.title) })
  }
}

/**
 * Real toasts. `onClick` routes the link while the toast is still up, in case Windows hands the
 * click to the running app instead of launching the protocol (either way the note opens once:
 * opening an open note is a no-op).
 */
export class WindowsNotifier implements Notifier {
  /** Toasts are kept referenced until they close, or their click handlers are collected. */
  private readonly live = new Set<Notification>()

  constructor(private readonly onClick: (link: string) => void) {}

  show(toast: Toast): void {
    if (!Notification.isSupported()) return
    const n = new Notification({
      title: toastTitle(toast.title),
      body: toast.body,
      silent: toast.silent ?? false,
      toastXml: process.platform === 'win32' ? toastXml(toast) : undefined,
    })
    this.live.add(n)
    n.on('click', () => this.onClick(toast.link))
    n.on('close', () => this.live.delete(n))
    n.on('failed', (_e, error) => {
      this.live.delete(n)
      console.error('[notify] toast failed', error)
    })
    n.show()
  }
}

function regQuery(key: string, value: string): Promise<number | null> {
  return new Promise((resolve) => {
    execFile('reg', ['query', key, '/v', value], { windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null) // a missing key or value means allowed
      const m = new RegExp(`${value}\\s+REG_DWORD\\s+0x([0-9a-f]+)`, 'i').exec(stdout)
      resolve(m ? parseInt(m[1]!, 16) : null)
    })
  })
}

/**
 * Whether Windows blocks Sprawl's toasts (ARCHITECTURE §2). Electron can't tell, so this reads
 * the registry: all app notifications off (`ToastEnabled = 0`), or Sprawl's own switch off
 * (`Enabled = 0` under its AppUserModelId). A missing key means allowed.
 */
export async function notificationStatus(appId: string): Promise<NotificationStatus> {
  if (process.platform !== 'win32') return 'granted'
  const base = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion'
  const [all, app] = await Promise.all([
    regQuery(`${base}\\PushNotifications`, 'ToastEnabled'),
    // Registry key names can't hold a backslash, so an exe-path id (unpackaged) has no key.
    appId.includes('\\')
      ? Promise.resolve(null)
      : regQuery(`${base}\\Notifications\\Settings\\${appId}`, 'Enabled'),
  ])
  return all === 0 || app === 0 ? 'blocked' : 'granted'
}
