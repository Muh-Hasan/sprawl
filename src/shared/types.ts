import type { NoteColor, RemindOption } from './constants'

/**
 * Data types shared by main and renderer (ARCHITECTURE §4–5). IDs are nanoid text and
 * timestamps are integer ms since epoch (UTC).
 */

export const CANVAS_ITEM_KINDS = ['note', 'drawing', 'image', 'link'] as const
export type CanvasItemKind = (typeof CANVAS_ITEM_KINDS)[number]

/** A card's position and size in world coordinates, and its stacking order. */
export interface CanvasRect {
  x: number
  y: number
  w: number
  h: number
}

/** What a note card shows of its note: the title, preview and the chips row (UI_SPEC §4.5). */
export interface CardNote {
  title: string
  color: NoteColor
  /** The start of the body as plain text (`body_text`), for the card preview. */
  preview: string
  checkTotal: number
  checkDone: number
  attachCount: number
  linkCount: number
  dueDay: string | null
  dueTime: string | null
  /** When the note was marked done, or null. Done cards hide unless "Show done" is on. */
  doneAt: number | null
}

/** The fields the renderer chooses for a card (the rest is set by main). */
export interface CanvasItemInput extends CanvasRect {
  id: string
  kind: CanvasItemKind
  /** The note, drawing or attachment id; null for a link card. */
  refId: string | null
  /** Link cards only. */
  url: string | null
  /** A link card's label. */
  title: string | null
  z: number
}

/** A row of `canvas_items`, plus its note's card fields for a note card. */
export interface CanvasItem extends CanvasItemInput {
  createdAt: number
  updatedAt: number
  note?: CardNote
}

/**
 * A new note. On the canvas it's created together with its card (a note never exists on the
 * canvas without one).
 */
export interface NewNote {
  id: string
  title: string
  color: NoteColor
  /** Plain text for the body, one paragraph per line (a note made by pasting text). */
  body?: string
  /** Copy the body and links of this note (a canvas duplicate, PRODUCT §3.1). */
  copyOf?: string
}

/** An external URL attached to a note (`note_links`). */
export interface NoteLink {
  id: string
  noteId: string
  url: string
  label: string | null
  position: number
}

/** A note as stored (ARCHITECTURE §4), with its links in order. */
export interface Note {
  id: string
  title: string
  /** The BlockNote document as JSON. */
  bodyJson: string
  bodyText: string
  color: NoteColor
  dueDay: string | null
  dueTime: string | null
  remind: RemindOption
  remindAt: number | null
  remindedAt: number | null
  doneAt: number | null
  checkTotal: number
  checkDone: number
  attachCount: number
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  links: NoteLink[]
  /** The note has a card on the canvas (list-only notes don't). */
  onCanvas: boolean
}

/**
 * The note fields `notes.update` changes. Main derives the rest on save: `body_text`, the
 * checklist and attachment counts from the body, and `remind_at` from the due fields
 * (ARCHITECTURE §4). Clearing `dueDay` clears the time and reminder too.
 */
export interface NotePatch {
  title?: string
  color?: NoteColor
  /** The BlockNote document as JSON (an array of blocks). */
  bodyJson?: string
  /** `YYYY-MM-DD`, local. */
  dueDay?: string | null
  /** `HH:mm`, local; null = due "sometime that day". */
  dueTime?: string | null
  remind?: RemindOption
}

export interface NoteLinkPatch {
  url?: string
  label?: string | null
}

export type CanvasItemPatch = Partial<
  Pick<CanvasItemInput, 'x' | 'y' | 'w' | 'h' | 'z' | 'url' | 'title'>
>

/**
 * The unit of canvas persistence and of undo (ARCHITECTURE §5). `canvas.apply` runs a batch in
 * one transaction.
 */
export type CanvasOp =
  | { op: 'create'; item: CanvasItemInput; note?: NewNote }
  | { op: 'update'; id: string; patch: CanvasItemPatch }
  /** Removes the card; a note or drawing card also soft-deletes its note or drawing. */
  | { op: 'delete'; id: string }
  /** The inverse of `delete`: puts the card back with its old id and un-deletes its ref. */
  | { op: 'restore'; item: CanvasItemInput }
  /** Sets the color of a note card's note. */
  | { op: 'setColor'; id: string; color: NoteColor }
  /** Marks a note card's note done (with its log entry) or not done (removing it). */
  | { op: 'setDone'; id: string; done: boolean }

export interface CanvasApplyResult {
  /** The created and restored rows as stored, so the renderer can replace its optimistic copies. */
  created: CanvasItem[]
}

// daily log ----------------------------------------------------------------------------------

export type LogEntryKind = 'done' | 'manual'

/** What a log entry shows of its note while the note exists (and isn't deleted). */
export interface LogEntryNote {
  title: string
  color: NoteColor
}

/** One line of a day's log (ARCHITECTURE §4). */
export interface LogEntry {
  id: string
  /** `YYYY-MM-DD`, local. */
  day: string
  /** The time shown (ms UTC). */
  at: number
  kind: LogEntryKind
  /** Manual: the entry. Done: the note title when it was marked done. */
  text: string
  noteId: string | null
  /** Done entries: the note's live title and color, or null once it's deleted or purged. */
  note: LogEntryNote | null
  createdAt: number
}

/** A day's log, in time order. */
export interface LogDay {
  day: string
  entries: LogEntry[]
}

/** A manual entry's editable fields. The time is a local `HH:mm` on the entry's own day. */
export interface LogEntryPatch {
  text?: string
  time?: string
}

// list view ----------------------------------------------------------------------------------

/** The List view's tabs (PRODUCT §3.3). */
export const LIST_TABS = ['open', 'due', 'done', 'all'] as const
export type ListTab = (typeof LIST_TABS)[number]

/** The List view's sorts, for the Open and All tabs (Due sorts by due date, Done by done time). */
export const LIST_SORTS = ['edited', 'created', 'title', 'due'] as const
export type ListSort = (typeof LIST_SORTS)[number]

/** What `notes.list` returns: a tab, its colors (none = all), a title filter and the sort. */
export interface NoteListQuery {
  tab: ListTab
  colors: NoteColor[]
  /** Matches titles containing it, ignoring case. Empty matches everything. */
  text: string
  sort: ListSort
}

/** One row of the List view (UI_SPEC §5b). */
export interface NoteListRow {
  id: string
  title: string
  color: NoteColor
  /** The first non-empty line of the body. */
  firstLine: string
  checkTotal: number
  checkDone: number
  linkCount: number
  dueDay: string | null
  dueTime: string | null
  doneAt: number | null
  createdAt: number
  updatedAt: number
  onCanvas: boolean
}

/** A note as lists show it (carried over, later backlinks). */
export interface NoteSummary {
  id: string
  title: string
  color: NoteColor
}
