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
 * one transaction. later: phase-5 adds `setDone`.
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

export interface CanvasApplyResult {
  /** The created and restored rows as stored, so the renderer can replace its optimistic copies. */
  created: CanvasItem[]
}
