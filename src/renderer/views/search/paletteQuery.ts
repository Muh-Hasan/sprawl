import { dueChipLabel, dueState } from '@shared/due'
import type { NoteListRow } from '@shared/types'

/** How many notes the palette lists for a search, and how many recent ones with no query. */
export const NOTE_RESULTS = 8
export const RECENT_NOTES = 3

export interface PaletteQuery {
  /** The query started with `>`: list commands only. */
  commandsOnly: boolean
  /** What to match, trimmed, without the `>`. */
  term: string
}

/** Reads what was typed into the palette (PRODUCT §3.6). */
export function parseQuery(raw: string): PaletteQuery {
  const text = raw.trimStart()
  const commandsOnly = text.startsWith('>')
  return { commandsOnly, term: (commandsOnly ? text.slice(1) : text).trim() }
}

/**
 * True if every word of `term` starts a word of `text` ("text big" finds "Make text bigger"),
 * ignoring case. An empty term matches everything.
 */
export function matchesWords(text: string, term: string): boolean {
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u)
  return term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => words.some((word) => word.startsWith(part)))
}

/**
 * Where a note result stands, on the right of its row: "Overdue", "Due Fri", "Done", or where it
 * lives ("Canvas", or "List" for a note with no card).
 */
export function noteContext(row: NoteListRow, now: number): string {
  if (row.doneAt !== null) return 'Done'
  if (row.dueDay !== null) {
    if (dueState(row.dueDay, row.dueTime, now) === 'overdue') return 'Overdue'
    return `Due ${dueChipLabel(row.dueDay, now)}`
  }
  return row.onCanvas ? 'Canvas' : 'List'
}
