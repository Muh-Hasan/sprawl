import type {
  CanvasItem,
  CanvasItemInput,
  CanvasItemPatch,
  CanvasOp,
  CanvasRect,
  CardNote,
  NewNote,
} from '@shared/types'

/**
 * Pure canvas-op logic (ARCHITECTURE §5–6): the optimistic local copy of what main stores, the
 * inverse of a batch (for undo and redo), and the snap and resize math.
 */

export type Items = ReadonlyMap<string, CanvasItem>

/** Note card sizes (UI_SPEC §4.5). The height is a floor: the card grows to fit its content. */
export const NOTE_SIZE = { w: 220, h: 64, minW: 160, maxW: 480, minH: 64, maxH: 320 } as const

/** Moves and resizes snap to this grid unless Alt is held (PRODUCT §3.1). */
export const SNAP_GRID = 8

/** A duplicate lands this far down and right of its original. */
export const DUPLICATE_OFFSET = 24

/** The card fields a client sends, without the ones main sets. */
export function inputOf(item: CanvasItem): CanvasItemInput {
  const { id, kind, refId, url, title, x, y, w, h, z } = item
  return { id, kind, refId, url, title, x, y, w, h, z }
}

/** The note a card shows, looked up when a card comes back (restore) or is copied. */
export type NoteLookup = (noteId: string) => CardNote | undefined

/** What the card of a new note shows: blank, a paste's text, or a copy (not the due date). */
export function newCardNote(note: NewNote, source?: CardNote): CardNote {
  return {
    title: note.title,
    color: note.color,
    preview: note.body ?? source?.preview ?? '',
    checkTotal: source?.checkTotal ?? 0,
    checkDone: source?.checkDone ?? 0,
    attachCount: source?.attachCount ?? 0,
    linkCount: source?.linkCount ?? 0,
    dueDay: null,
    dueTime: null,
    doneAt: null,
  }
}

/** Applies one op to `items` in place. */
function applyOp(items: Map<string, CanvasItem>, op: CanvasOp, now: number, notes: NoteLookup) {
  switch (op.op) {
    case 'create': {
      const { note } = op
      const cardNote = note && newCardNote(note, note.copyOf ? notes(note.copyOf) : undefined)
      items.set(op.item.id, { ...op.item, createdAt: now, updatedAt: now, note: cardNote })
      break
    }
    case 'restore': {
      const note = op.item.refId === null ? undefined : notes(op.item.refId)
      items.set(op.item.id, { ...op.item, createdAt: now, updatedAt: now, note })
      break
    }
    case 'update': {
      const item = items.get(op.id)
      if (item) items.set(op.id, { ...item, ...op.patch, updatedAt: now })
      break
    }
    case 'setColor': {
      const item = items.get(op.id)
      if (item?.note) items.set(op.id, { ...item, note: { ...item.note, color: op.color } })
      break
    }
    case 'setDone': {
      const item = items.get(op.id)
      if (!item?.note || (item.note.doneAt !== null) === op.done) break
      items.set(op.id, { ...item, note: { ...item.note, doneAt: op.done ? now : null } })
      break
    }
    case 'delete':
      items.delete(op.id)
      break
  }
}

/** Applies ops to a copy of `items` (the optimistic local copy of what main will store). */
export function reduceOps(
  items: Items,
  ops: readonly CanvasOp[],
  now = Date.now(),
  notes: NoteLookup = () => undefined,
): Items {
  const next = new Map(items)
  for (const op of ops) applyOp(next, op, now, notes)
  return next
}

/** The op that undoes `op`, given the items just before it ran (null if it changes nothing). */
function invertOp(items: Items, op: CanvasOp): CanvasOp | null {
  switch (op.op) {
    case 'create':
    case 'restore':
      return { op: 'delete', id: op.item.id }
    case 'delete': {
      const item = items.get(op.id)
      return item ? { op: 'restore', item: inputOf(item) } : null
    }
    case 'update': {
      const item = items.get(op.id)
      if (!item) return null
      const patch: Record<string, unknown> = {}
      for (const key of Object.keys(op.patch) as (keyof CanvasItemPatch)[]) patch[key] = item[key]
      return { op: 'update', id: op.id, patch: patch as CanvasItemPatch }
    }
    case 'setColor': {
      const color = items.get(op.id)?.note?.color
      return color ? { op: 'setColor', id: op.id, color } : null
    }
    case 'setDone': {
      const note = items.get(op.id)?.note
      if (!note || (note.doneAt !== null) === op.done) return null
      return { op: 'setDone', id: op.id, done: !op.done }
    }
  }
}

/**
 * The batch that undoes `ops` when applied after them. Each op is inverted against the state
 * just before it ran, so a batch that touches one card twice still inverts correctly.
 */
export function invertOps(items: Items, ops: readonly CanvasOp[]): CanvasOp[] {
  const state = new Map(items)
  const inverse: CanvasOp[] = []
  for (const op of ops) {
    const inv = invertOp(state, op)
    if (inv) inverse.push(inv)
    applyOp(state, op, 0, () => undefined)
  }
  return inverse.reverse()
}

export function snapTo(value: number, grid = SNAP_GRID): number {
  return Math.round(value / grid) * grid
}

/**
 * A move of (dx, dy), snapped so `anchor` (the grabbed card's top-left) lands on the grid. Every
 * selected card moves by the same delta, so their spacing never changes.
 */
export function snapMove(
  anchor: { x: number; y: number },
  dx: number,
  dy: number,
  snap: boolean,
): { dx: number; dy: number } {
  if (!snap) return { dx, dy }
  return { dx: snapTo(anchor.x + dx) - anchor.x, dy: snapTo(anchor.y + dy) - anchor.y }
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se'
export const CORNERS: readonly Corner[] = ['nw', 'ne', 'sw', 'se']

export interface SizeLimits {
  minW: number
  maxW: number
  minH: number
  maxH: number
}

/** One axis of a resize: the dragged edge moves, the opposite edge stays put. */
function resizeAxis(
  start: number,
  size: number,
  delta: number,
  movesStart: boolean,
  min: number,
  max: number,
  snap: boolean,
): [number, number] {
  if (movesStart) {
    const end = start + size
    let edge = start + delta
    if (snap) edge = snapTo(edge)
    const next = Math.min(max, Math.max(min, end - edge))
    return [end - next, next]
  }
  let edge = start + size + delta
  if (snap) edge = snapTo(edge)
  return [start, Math.min(max, Math.max(min, edge - start))]
}

/** The rect after dragging `corner` by (dx, dy), within `limits`, with the far corner fixed. */
export function resizeRect(
  rect: CanvasRect,
  corner: Corner,
  dx: number,
  dy: number,
  limits: SizeLimits,
  snap: boolean,
): CanvasRect {
  const [x, w] = resizeAxis(rect.x, rect.w, dx, corner[1] === 'w', limits.minW, limits.maxW, snap)
  const [y, h] = resizeAxis(rect.y, rect.h, dy, corner[0] === 'n', limits.minH, limits.maxH, snap)
  return { x, y, w, h }
}

/**
 * The note drawn with the Note tool from `a` to `b` (world), within the note size limits. It
 * grows from the corner where the drag started, whichever way the drag goes.
 */
export function drawnNoteRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  snap: boolean,
): CanvasRect {
  const s = (v: number) => (snap ? snapTo(v) : v)
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
  const ax = s(a.x)
  const ay = s(a.y)
  const w = clamp(Math.abs(s(b.x) - ax), NOTE_SIZE.minW, NOTE_SIZE.maxW)
  const h = clamp(Math.abs(s(b.y) - ay), NOTE_SIZE.minH, NOTE_SIZE.maxH)
  return { x: b.x < a.x ? ax - w : ax, y: b.y < a.y ? ay - h : ay, w, h }
}

/** True if two rects overlap (touching edges don't count). */
export function intersects(a: CanvasRect, b: CanvasRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** The rect spanned by two points (a marquee drag), in either direction. */
export function rectFromPoints(a: { x: number; y: number }, b: { x: number; y: number }) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  }
}

/** The top of the stack: one above the highest card. */
export function topZ(items: Iterable<CanvasItem>): number {
  let max = 0
  for (const item of items) max = Math.max(max, item.z)
  return max + 1
}

/**
 * Ops that move `ids` to the front (or back) of the stack, keeping their order among
 * themselves. Nothing changes if they're already there.
 */
export function restackOps(items: Items, ids: Iterable<string>, to: 'front' | 'back'): CanvasOp[] {
  const chosen = new Set(ids)
  const moving = [...items.values()].filter((i) => chosen.has(i.id)).sort((a, b) => a.z - b.z)
  const otherZs = [...items.values()].filter((i) => !chosen.has(i.id)).map((i) => i.z)
  if (moving.length === 0 || otherZs.length === 0) return []
  const lowest = moving[0]!.z
  const highest = moving.at(-1)!.z
  let start: number
  if (to === 'front') {
    const top = Math.max(...otherZs)
    if (lowest > top) return []
    start = top + 1
  } else {
    const bottom = Math.min(...otherZs)
    if (highest < bottom) return []
    start = bottom - moving.length
  }
  return moving.map((item, i) => ({ op: 'update', id: item.id, patch: { z: start + i } }))
}
