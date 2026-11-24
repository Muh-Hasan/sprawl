import { PROTOCOL } from './constants'

/** A parsed `sprawl://` link (ARCHITECTURE §2). */
export type DeepLink = { type: 'open-note'; id: string } | { type: 'open-list-due' }

const ID = /^[A-Za-z0-9_-]{1,64}$/

/** Parses `sprawl://note/<id>` or `sprawl://list/due`. Anything else gives null. */
export function parseDeepLink(raw: string): DeepLink | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== `${PROTOCOL}:`) return null
  // `sprawl://note/abc` parses with host 'note' and pathname '/abc'.
  const parts = [url.hostname, ...url.pathname.split('/')].filter(Boolean)
  const [route, arg, extra] = parts
  if (extra !== undefined) return null
  if (route === 'note' && arg && ID.test(arg)) return { type: 'open-note', id: arg }
  if (route === 'list' && arg === 'due') return { type: 'open-list-due' }
  return null
}

/** Finds the first valid deep link in a process argv (Windows passes it as a plain argument). */
export function findDeepLink(argv: readonly string[]): DeepLink | null {
  for (const arg of argv) {
    if (!arg.toLowerCase().startsWith(`${PROTOCOL}://`)) continue
    const link = parseDeepLink(arg)
    if (link) return link
  }
  return null
}
