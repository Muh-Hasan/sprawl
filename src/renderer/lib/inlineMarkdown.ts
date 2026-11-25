import { isAllowedExternalUrl } from '@shared/schemas'

/**
 * Inline markdown for manual log entries (UI_SPEC §6): **bold**, *italic* or _italic_, `code`
 * and [links](https://…). Anything else stays plain text; there's no HTML, so nothing typed is
 * ever interpreted as markup.
 */

export type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold' | 'italic'; children: InlineToken[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; url: string; children: InlineToken[] }

/** The first construct at each position wins; earlier patterns are tried first. */
const PATTERNS: { re: RegExp; make: (m: RegExpExecArray) => InlineToken | null }[] = [
  { re: /`([^`]+)`/y, make: (m) => ({ kind: 'code', text: m[1]! }) },
  {
    re: /\[([^\]]+)\]\(([^)\s]+)\)/y,
    make: (m) =>
      isAllowedExternalUrl(m[2]!)
        ? { kind: 'link', url: m[2]!, children: parseInline(m[1]!) }
        : null,
  },
  {
    re: /\*\*(?=\S)(.+?)(?<=\S)\*\*/y,
    make: (m) => ({ kind: 'bold', children: parseInline(m[1]!) }),
  },
  {
    re: /([*_])(?=\S)(.+?)(?<=\S)\1/y,
    make: (m) => ({ kind: 'italic', children: parseInline(m[2]!) }),
  },
]

/** Splits a line into inline tokens. */
export function parseInline(text: string): InlineToken[] {
  const out: InlineToken[] = []
  let plain = ''
  let i = 0
  const flush = (): void => {
    if (plain) out.push({ kind: 'text', text: plain })
    plain = ''
  }
  outer: while (i < text.length) {
    if ('`[*_'.includes(text[i]!)) {
      for (const { re, make } of PATTERNS) {
        re.lastIndex = i
        const m = re.exec(text)
        const token = m && make(m)
        if (m && token) {
          flush()
          out.push(token)
          i += m[0].length
          continue outer
        }
      }
    }
    plain += text[i]
    i++
  }
  flush()
  return out
}
