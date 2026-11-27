import { nanoid } from 'nanoid'
import type { NoteColor } from '@shared/constants'
import type { CanvasOp } from '@shared/types'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { viewCenter } from './actions'
import { revealRect } from './camera'
import { markFresh } from './fresh'
import { NOTE_SIZE, snapTo, topZ } from './ops'
import { boundsOf } from './Viewport'

interface SampleNote {
  title: string
  body: string
  color: NoteColor
  /** Where the card sits in the board, from its top-left corner (world px). */
  dx: number
  dy: number
}

/**
 * The welcome board (UI_SPEC §10): five notes that each teach one thing. Every line describes
 * what the app really does today, so keep them in step with PRODUCT when a shortcut changes.
 */
export const WELCOME_NOTES: readonly SampleNote[] = [
  {
    title: 'Drag me around',
    body: 'Notes go anywhere. Hold Space and drag to pan, Ctrl + scroll to zoom.',
    color: 'sand',
    dx: 0,
    dy: 16,
  },
  {
    title: 'Open a note',
    body: 'Select it and press Enter for the full editor: headings, lists and checklists.',
    color: 'sky',
    dx: 296,
    dy: 0,
  },
  {
    title: 'Give it a due date',
    body: 'Right-click → Due date… It shows up in List, with a reminder if you pick a time.',
    color: 'rose',
    dx: 592,
    dy: 32,
  },
  {
    title: 'Tick it off',
    body: 'Ctrl + Enter marks it done. It lands in today’s log.',
    color: 'sage',
    dx: 120,
    dy: 232,
  },
  {
    title: 'Find anything',
    body: 'Ctrl + K searches your notes and runs every command.',
    color: 'lilac',
    dx: 448,
    dy: 248,
  },
]

/** The board's size, used to center it (cards grow with their text, so this is approximate). */
const BOARD = { w: 592 + NOTE_SIZE.w, h: 248 + 112 }

/**
 * Places the welcome board in the middle of the view, as one batch so a single Ctrl+Z takes it
 * away again, and selects nothing.
 */
export function openWelcomeBoard(): void {
  const { items, snap, apply } = useCanvasStore.getState()
  const place = (v: number) => (snap ? snapTo(v) : Math.round(v))
  const center = viewCenter()
  const left = center.x - BOARD.w / 2
  const top = center.y - BOARD.h / 2
  const z = topZ(items.values())

  const ops: CanvasOp[] = WELCOME_NOTES.map((n, i) => {
    const id = nanoid()
    markFresh(id)
    const noteId = nanoid()
    return {
      op: 'create',
      item: {
        id,
        kind: 'note',
        refId: noteId,
        url: null,
        title: null,
        x: place(left + n.dx),
        y: place(top + n.dy),
        w: NOTE_SIZE.w,
        h: NOTE_SIZE.h,
        z: z + i,
      },
      note: { id: noteId, title: n.title, color: n.color, body: n.body },
    }
  })
  apply(ops)
  useSelectionStore.getState().clear()

  const rects = ops.flatMap((op) => (op.op === 'create' ? [op.item] : []))
  const bounds = boundsOf(rects)
  if (bounds) revealRect({ ...bounds, h: BOARD.h })
}
