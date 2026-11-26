import { nanoid } from 'nanoid'

/**
 * Fields derived from a note's body on save (ARCHITECTURE §4): the plain text (for the card
 * preview and, from phase 10, search), and the checklist and attachment counts for the card
 * chips. later: phase-9 collects the `ref` inline nodes into `refs` here too.
 */

export interface DerivedBody {
  /** The BlockNote document as JSON. */
  bodyJson: string
  /** The plain text, one line per block. */
  bodyText: string
}

export interface DerivedFields {
  bodyText: string
  checkTotal: number
  checkDone: number
  /** Image and file blocks. */
  attachCount: number
}

/** The parts of a BlockNote block that derivation reads. Anything else is ignored. */
interface BlockLike {
  type?: unknown
  props?: { checked?: unknown } | null
  content?: unknown
  children?: unknown
}

const ATTACHMENT_BLOCKS = new Set(['image', 'file'])

/** The text of a block's inline content: text runs, link text and custom inline content. */
function inlineText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  let out = ''
  for (const node of content as unknown[]) {
    if (typeof node !== 'object' || node === null) continue
    const n = node as { type?: unknown; text?: unknown; content?: unknown }
    if (typeof n.text === 'string') out += n.text
    else if (n.content !== undefined) out += inlineText(n.content)
  }
  return out
}

/** Walks a BlockNote document (blocks and their nested children) and derives its fields. */
export function deriveBody(blocks: readonly unknown[]): DerivedFields {
  const lines: string[] = []
  let checkTotal = 0
  let checkDone = 0
  let attachCount = 0

  const walk = (list: unknown): void => {
    if (!Array.isArray(list)) return
    for (const raw of list as unknown[]) {
      if (typeof raw !== 'object' || raw === null) continue
      const block = raw as BlockLike
      if (block.type === 'checkListItem') {
        checkTotal++
        if (block.props?.checked === true) checkDone++
      }
      if (typeof block.type === 'string' && ATTACHMENT_BLOCKS.has(block.type)) attachCount++
      // Blocks without inline content (divider, image, file) add no line.
      if (Array.isArray(block.content)) lines.push(inlineText(block.content))
      walk(block.children)
    }
  }
  walk(blocks)

  // Empty paragraphs at either end (BlockNote keeps a trailing one) aren't part of the text.
  while (lines.length > 0 && lines[0]?.trim() === '') lines.shift()
  while (lines.length > 0 && lines.at(-1)?.trim() === '') lines.pop()
  return { bodyText: lines.join('\n'), checkTotal, checkDone, attachCount }
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

/** The text of the first checklist item that isn't ticked, for a reminder's "Next:" (or null). */
export function firstOpenCheckItem(blocks: readonly unknown[]): string | null {
  const find = (list: unknown): string | null => {
    if (!Array.isArray(list)) return null
    for (const raw of list as unknown[]) {
      if (typeof raw !== 'object' || raw === null) continue
      const block = raw as BlockLike
      if (block.type === 'checkListItem' && block.props?.checked !== true) {
        const text = inlineText(block.content).trim()
        if (text !== '') return text
      }
      const nested = find(block.children)
      if (nested !== null) return nested
    }
    return null
  }
  return find(blocks)
}
