import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import type { NoteColor } from '@shared/constants'
import { cascadeSpot } from '@shared/placement'
import type { CanvasOp, CanvasRect } from '@shared/types'
import { shownItems, useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useUiStore } from '@/stores/uiStore'
import { showUndoToast } from '@/components/UndoToast'
import { DUPLICATE_OFFSET, inputOf, NOTE_SIZE, restackOps, snapTo, topZ } from './ops'
import { centerOnRect, revealRect } from './camera'
import { renderedRect } from './measure'
import { markFresh } from './fresh'
import { pointerWorld } from './pointer'
import { screenToWorld, type Point } from './Viewport'

/**
 * Canvas commands (PRODUCT §3.1), shared by the keyboard, the pointer, the toolbar and the
 * context menu. Each one is a single recorded `canvas.apply` batch, so one Ctrl+Z undoes it.
 */

const canvas = () => useCanvasStore.getState()
const selection = () => useSelectionStore.getState()

/**
 * Opens the selected note card's note in the panel (Enter, the menu's Open). With `due`, the
 * panel also opens its date picker (the menu's Due date…). Only for a single note card.
 */
export function openSelectedNote({ due = false }: { due?: boolean } = {}): void {
  const { selected } = selection()
  if (selected.size !== 1) return
  const [id] = selected
  const item = id === undefined ? undefined : canvas().items.get(id)
  if (item?.kind !== 'note' || item.refId === null) return
  useUiStore.getState().openNote(item.refId, { due })
}

/**
 * Starts writing in a note card's body, right on the canvas (double-click on the body, or Enter
 * after the card's title). An open panel moves to this note and follows the typing live.
 */
export function editCardBody(id: string): void {
  const item = canvas().items.get(id)
  if (item?.kind !== 'note' || item.refId === null) return
  const ui = useUiStore.getState()
  if (ui.openNoteId !== null && ui.openNoteId !== item.refId) ui.openNote(item.refId)
  selection().select([id])
  selection().setEditing(null)
  selection().setBodyEditing(id)
}

/** The world point in the middle of the view. */
export function viewCenter(): Point {
  const { viewport, size } = canvas()
  return screenToWorld(viewport, { x: size.width / 2, y: size.height / 2 })
}

interface NewNoteOptions {
  title?: string
  body?: string
  /** Put the cursor in the new card's title. */
  edit?: boolean
  /** Step 40px down and right past cards already on the spot (a paste), instead of covering them. */
  cascade?: boolean
}

/**
 * Creates a note with its card, centered on `at` (world), and selects it. The card pops in and
 * the view glides to it if it's off screen or too small to read (FigJam-style).
 */
export function createNoteAt(at: Point, { cascade = false, ...options }: NewNoteOptions = {}) {
  const place = (v: number) => (canvas().snap ? snapTo(v) : Math.round(v))
  const start = { x: place(at.x - NOTE_SIZE.w / 2), y: place(at.y - NOTE_SIZE.h / 2) }
  const { x, y } = cascade ? cascadeSpot(start, shownItems().values()) : start
  return createNoteIn({ x, y, w: NOTE_SIZE.w, h: NOTE_SIZE.h }, options)
}

/** Creates a note whose card fills `rect` (world), as drawn with the Note tool. */
export function createNoteIn(
  rect: CanvasRect,
  { title = '', body, edit = false }: NewNoteOptions = {},
) {
  const { items, apply } = canvas()
  const id = nanoid()
  markFresh(id)
  const noteId = nanoid()
  apply([
    {
      op: 'create',
      item: {
        id,
        kind: 'note',
        refId: noteId,
        url: null,
        title: null,
        ...rect,
        z: topZ(items.values()),
      },
      note: { id: noteId, title, color: 'stone', ...(body ? { body } : {}) },
    },
  ])
  selection().select([id])
  selection().setEditing(edit ? id : null)
  revealRect(rect)
  return id
}

/**
 * Pasted text becomes a note: the first line is the title, the rest the body. It lands under
 * the pointer (or in the middle of the view), and a paste onto a card fans out from it.
 * later: phase-7 turns a pasted URL into a link card instead.
 */
export function createNoteFromText(text: string, at: Point = pointerWorld() ?? viewCenter()) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const first = lines.findIndex((l) => l.trim() !== '')
  if (first === -1) return null
  const title = lines[first]!.trim().slice(0, 10_000)
  const body = lines
    .slice(first + 1)
    .join('\n')
    .replace(/^\s*\n/, '')
    .trimEnd()
  return createNoteAt(at, { title, body: body || undefined, cascade: true })
}

/** Deletes the selected cards (and their notes), with a "Deleted · Undo" toast. */
export function deleteSelection() {
  const ids = [...selection().selected]
  if (ids.length === 0) return
  const step = canvas().apply(ids.map((id): CanvasOp => ({ op: 'delete', id })))
  selection().clear()
  if (step !== null) showUndoToast('Deleted', () => canvas().undoStep(step))
}

/** Copies each selected note card as a new note with its own card, 24px down and right. */
export function duplicateSelection() {
  const { items, apply } = canvas()
  const sources = [...selection().selected]
    .map((id) => items.get(id))
    .filter((item) => item?.kind === 'note' && item.note && item.refId)
    .sort((a, b) => a!.z - b!.z)
  if (sources.length === 0) return
  let z = topZ(items.values())
  const ops: CanvasOp[] = []
  const ids: string[] = []
  for (const source of sources) {
    const { note, refId } = source!
    const id = nanoid()
    const noteId = nanoid()
    ids.push(id)
    markFresh(id)
    ops.push({
      op: 'create',
      item: {
        ...inputOf(source!),
        id,
        refId: noteId,
        x: source!.x + DUPLICATE_OFFSET,
        y: source!.y + DUPLICATE_OFFSET,
        z: z++,
      },
      note: { id: noteId, title: note!.title, color: note!.color, copyOf: refId! },
    })
  }
  apply(ops)
  selection().select(ids)
  toast('Duplicated')
}

export function restackSelection(to: 'front' | 'back') {
  const { items, apply } = canvas()
  apply(restackOps(items, selection().selected, to))
}

export function setSelectionColor(color: NoteColor) {
  const { items, apply } = canvas()
  const ops = [...selection().selected]
    .filter((id) => {
      const note = items.get(id)?.note
      return note !== undefined && note.color !== color
    })
    .map((id): CanvasOp => ({ op: 'setColor', id, color }))
  apply(ops)
}

export function selectAll() {
  selection().select(shownItems().keys())
}

/**
 * Marks note cards done, or not done, as one undoable step (PRODUCT §3.1). Done cards fade off
 * the canvas unless "Show done" is on, and leave the selection; "Marked done · Undo" follows.
 */
export function setCardsDone(ids: Iterable<string>, done: boolean): void {
  const { items, apply } = canvas()
  const ops = [...ids]
    .filter((id) => {
      const note = items.get(id)?.note
      return note !== undefined && (note.doneAt !== null) !== done
    })
    .map((id): CanvasOp => ({ op: 'setDone', id, done }))
  const step = apply(ops)
  if (step === null || !done) return
  if (!canvas().showDone) {
    const gone = new Set(ops.map((op) => (op.op === 'setDone' ? op.id : '')))
    selection().select([...selection().selected].filter((id) => !gone.has(id)))
    if (gone.has(selection().bodyEditing ?? '')) selection().setBodyEditing(null)
  }
  showUndoToast('Marked done', () => canvas().undoStep(step))
}

/**
 * Ctrl+Enter and the menu's Mark done: marks the selected notes done, or, if every one is done
 * already (shown with "Show done"), not done.
 */
export function toggleSelectionDone(): void {
  const { items } = canvas()
  const notes = [...selection().selected].filter((id) => items.get(id)?.note)
  if (notes.length === 0) return
  const allDone = notes.every((id) => items.get(id)?.note?.doneAt != null)
  setCardsDone(notes, !allDone)
}

/**
 * Nudges the selection with the arrow keys. Held keys repeat, so the moves collect in the
 * transient rects and are written once, when the key comes up (`endNudge`).
 */
export function nudgeSelection(dx: number, dy: number) {
  const { selected, gesture, transient, beginGesture, setTransient } = selection()
  if (selected.size === 0 || (gesture && gesture !== 'nudge')) return
  const { items } = canvas()
  const base: ReadonlyMap<string, CanvasRect> =
    transient ??
    new Map(
      [...selected].flatMap((id) => {
        const item = items.get(id)
        return item ? [[id, { x: item.x, y: item.y, w: item.w, h: item.h }] as const] : []
      }),
    )
  const next = new Map<string, CanvasRect>()
  for (const [id, r] of base) next.set(id, { ...r, x: r.x + dx, y: r.y + dy })
  if (!gesture) beginGesture('nudge', next)
  else setTransient(next)
}

export function endNudge() {
  if (selection().gesture === 'nudge') selection().commitGesture()
}

/** Switches to the canvas if need be, and runs `fn` once it has loaded. */
export function whenCanvasReady(fn: () => void): void {
  const ui = useUiStore.getState()
  if (ui.view === 'canvas' && canvas().ready) return fn()
  ui.setView('canvas')
  const stop = useCanvasStore.subscribe((s) => {
    if (!s.ready) return
    stop()
    fn()
  })
}

/**
 * "Show on canvas" (the list, PRODUCT §3.3): switches to the canvas, then selects the note's
 * card and glides to it once the canvas has loaded.
 */
export function showNoteOnCanvas(noteId: string): void {
  whenCanvasReady(() => {
    const id = canvas().cardOf(noteId)
    const item = id === null ? undefined : canvas().items.get(id)
    if (!item) return
    selection().select([item.id])
    centerOnRect(renderedRect(item))
  })
}
