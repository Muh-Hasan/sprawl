import { nanoid } from 'nanoid'

/**
 * Fields derived from a note's body on save (ARCHITECTURE §4). later: phase-4 derives
 * `body_text`, the checklist and attachment counts and the refs from the BlockNote document.
 */

export interface DerivedBody {
  /** The BlockNote document as JSON. */
  bodyJson: string
  /** The plain text, one line per block. */
  bodyText: string
}

/** Plain text (a paste) as a BlockNote document: one paragraph per line. */
export function textToBody(text: string): DerivedBody {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  while (lines.length > 0 && lines.at(-1)?.trim() === '') lines.pop()
  const blocks = lines.map((line) => ({
    id: nanoid(),
    type: 'paragraph',
    props: {},
    content: line === '' ? [] : [{ type: 'text', text: line, styles: {} }],
    children: [],
  }))
  return { bodyJson: JSON.stringify(blocks), bodyText: lines.join('\n') }
}
