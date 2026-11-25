import { isAllowedExternalUrl } from '@shared/schemas'

/**
 * Turns what was pasted into "Add link" into a URL Sprawl can open: http, https or mailto. A
 * bare domain ("example.com/x") gets https://. Returns null for anything else.
 */
export function normalizeUrl(text: string): string | null {
  const t = text.trim()
  if (t === '' || /\s/.test(t)) return null
  if (isAllowedExternalUrl(t)) return t
  // Something with a scheme we don't open (file:, javascript:…) stays refused.
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^[^:/]+:\d/.test(t)) return null
  if (!/^[^/?#]+\.[^/?#]+/.test(t)) return null
  const withScheme = `https://${t}`
  return isAllowedExternalUrl(withScheme) ? withScheme : null
}

/** The domain shown for a link ("github.com"), without "www."; the address for mailto. */
export function domainOf(url: string): string {
  try {
    const u = new URL(url)
    if (u.protocol === 'mailto:') return u.pathname
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** The letter in a link's square (UI_SPEC §4.8): the domain's first character, uppercased. */
export function domainLetter(url: string): string {
  return (domainOf(url)[0] ?? '?').toUpperCase()
}
