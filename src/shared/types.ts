import type { NoteColor } from './constants'

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

/** What a note card shows of its note. later: phase-3 adds the preview and the chip counts. */
export interface CardNote {
  title: string
  color: NoteColor
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

/** The note created together with its card (a note never exists on the canvas without one). */
export interface NewNote {
  id: string
  title: string
  color: NoteColor
}

export type CanvasItemPatch = Partial<
  Pick<CanvasItemInput, 'x' | 'y' | 'w' | 'h' | 'z' | 'url' | 'title'>
>

/**
 * The unit of canvas persistence (and, from phase 3, of undo). `canvas.apply` runs a batch in
 * one transaction. later: phase-3 adds `restore` and `setColor`, phase-5 `setDone`.
 */
export type CanvasOp =
  | { op: 'create'; item: CanvasItemInput; note?: NewNote }
  | { op: 'update'; id: string; patch: CanvasItemPatch }
  | { op: 'delete'; id: string }

export interface CanvasApplyResult {
  /** The created rows as stored, so the renderer can replace its optimistic copies. */
  created: CanvasItem[]
}
