import { create } from 'zustand'
import type { CanvasItem, CanvasOp, CardNote } from '@shared/types'
import { debounce } from '@/lib/debounce'
import { invertOps, reduceOps, type Items } from '@/views/canvas/ops'
import { SpatialGrid } from '@/views/canvas/spatial'
import { lerpViewport, type Size, type Viewport } from '@/views/canvas/Viewport'
import { clockNow } from './clockStore'
import { canvasHistory } from './historyStore'
import { useLogStore } from './logStore'

export type CanvasTool = 'select' | 'hand' | 'note'

/** The viewport is saved this long after it stops moving (and on blur or close). */
const VIEWPORT_SAVE_MS = 400

/** A card marked done fades out over this long before it's hidden (DESIGN_SYSTEM §6). */
export const DONE_EXIT_MS = 180

interface CanvasState {
  ready: boolean
  items: Items
  viewport: Viewport
  /** The canvas element's size in px. */
  size: Size
  tool: CanvasTool
  /** Space held: temporary Hand mode. */
  spaceHeld: boolean
  /** A pan drag is in progress. */
  panning: boolean
  /** The `snap` setting: moves and resizes snap to the 8px grid. */
  snap: boolean
  /** The `showDone` setting: done cards show, faded and struck through, instead of hiding. */
  showDone: boolean
  /** Cards just marked done, still playing their exit before they hide. */
  leaving: ReadonlySet<string>
  /** Loads the cards and the saved viewport for the open vault. */
  load(): Promise<void>
  /** Sends what's pending and forgets the loaded state (the canvas view closed). */
  unload(): void
  /**
   * Applies ops locally right away, then persists them in one batched `canvas.apply`. Unless
   * `record` is false, the step goes on the undo stack; returns its history id.
   */
  apply(ops: CanvasOp[], options?: { record?: boolean }): number | null
  undo(): void
  redo(): void
  /** Undoes one particular step (a toast's Undo), even if other steps came after it. */
  undoStep(id: number): void
  /** Renames a note card's note (not an undoable canvas op; the title is note content). */
  renameNote(itemId: string, title: string): void
  /**
   * Shows a note's new card fields on its card (after a panel edit or save). Local only: the
   * note itself was saved through `notes.update`.
   */
  syncNote(noteId: string, fields: Partial<CardNote>): void
  /** The card of a note, if it's on the canvas. */
  cardOf(noteId: string): string | null
  /** Moves the view (not animated). Saving is debounced. */
  setViewport(vp: Viewport): void
  /**
   * Glides the view to `to` over `ms` (ease-out), or jumps there with reduced motion. Any other
   * viewport change cancels the glide. See `views/canvas/camera.ts`.
   */
  animateViewport(to: Viewport, ms: number): void
  setSize(size: Size): void
  setTool(tool: CanvasTool): void
  setSpaceHeld(held: boolean): void
  setPanning(panning: boolean): void
  /** Shows or hides done cards, and saves the `showDone` setting. */
  setShowDone(on: boolean): void
  /** Sends the pending ops and viewport now (on blur, unmount and close). */
  flush(): void
}

/** The spatial index of the loaded cards, kept in step with `items` (not reactive state). */
export const canvasGrid = new SpatialGrid()

/**
 * What deleted note cards showed, by note id, so undoing a delete puts the card back as it was
 * without waiting for main.
 */
const deletedNotes = new Map<string, CardNote>()

/**
 * True if the card is on show: anything but a done note, unless "Show done" is on or it's still
 * fading out. Hidden cards stay in `items` (undo brings them back) but not in the spatial grid,
 * so culling, the marquee and hit tests never find them.
 */
export function isShown(
  item: CanvasItem,
  { showDone, leaving }: Pick<CanvasState, 'showDone' | 'leaving'>,
): boolean {
  return showDone || !item.note?.doneAt || leaving.has(item.id)
}

/** The cards on show (for the selection, select all and zoom to fit). */
export function shownItems(): Items {
  const state = useCanvasStore.getState()
  const shown = new Map<string, CanvasItem>()
  for (const item of state.items.values()) if (isShown(item, state)) shown.set(item.id, item)
  return shown
}

/** Brings the spatial grid in line with `items` for the given ids (or every card). */
function syncGrid(
  state: Pick<CanvasState, 'items' | 'showDone' | 'leaving'>,
  ids?: Iterable<string>,
) {
  if (!ids) canvasGrid.clear()
  for (const id of ids ?? state.items.keys()) {
    const item = state.items.get(id)
    if (item && isShown(item, state)) canvasGrid.set(id, item)
    else canvasGrid.delete(id)
  }
}

const opIds = (ops: readonly CanvasOp[]): string[] =>
  ops.map((op) => (op.op === 'create' || op.op === 'restore' ? op.item.id : op.id))

/** Looks a note up among the live cards (built on first use) or the deleted ones. */
function noteLookup(items: Items): (noteId: string) => CardNote | undefined {
  let byNote: Map<string, CardNote> | null = null
  return (noteId) => {
    if (!byNote) {
      byNote = new Map()
      for (const item of items.values())
        if (item.note && item.refId) byNote.set(item.refId, item.note)
    }
    return byNote.get(noteId) ?? deletedNotes.get(noteId)
  }
}

let pendingOps: CanvasOp[] = []
let flushQueued = false
let cameraFrame = 0
/** Where the running glide ends, so repeated zoom steps build on it rather than lag. */
let cameraTarget: Viewport | null = null

/** The viewport the view is at, or heading to if it's gliding. */
export function viewportTarget(): Viewport {
  return cameraTarget ?? useCanvasStore.getState().viewport
}
/** Bumped by every load and unload, so a load that finishes late is dropped. */
let loadToken = 0
/** Called after undo and redo (the selection drops the cards that are gone). */
let afterHistory: ((items: Items) => void) | null = null

/** Lets the selection store follow undo and redo without a circular import. */
export function onHistoryApplied(fn: (items: Items) => void): void {
  afterHistory = fn
}

const saveViewport = debounce((vp: Viewport) => {
  void window.sprawl.settings.set('viewport', vp)
}, VIEWPORT_SAVE_MS)

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export const useCanvasStore = create<CanvasState>()((set, get) => {
  const sendOps = (): void => {
    flushQueued = false
    if (pendingOps.length === 0) return
    const ops = pendingOps
    pendingOps = []
    const touchesLog = ops.some((op) => op.op === 'setDone')
    window.sprawl.canvas.apply(ops).then(
      ({ created }) => {
        if (touchesLog) useLogStore.getState().changed()
        if (created.length === 0) return
        // Only take what main adds: the card may have moved locally since this batch went out.
        const items = new Map(get().items)
        for (const row of created) {
          const local = items.get(row.id)
          if (local) {
            items.set(row.id, { ...local, createdAt: row.createdAt, note: local.note ?? row.note })
          }
        }
        set({ items })
      },
      (err: unknown) => {
        // Main rejected the batch (rolled back), so reload what's really stored.
        console.error('[canvas] apply failed; reloading', err)
        void get().load()
      },
    )
  }

  const queueSend = (): void => {
    if (flushQueued) return
    flushQueued = true
    queueMicrotask(sendOps)
  }

  /** Applies ops locally and queues them for main; returns their inverse. */
  const run = (ops: readonly CanvasOp[]): CanvasOp[] => {
    const before = get().items
    const inverse = invertOps(before, ops)
    for (const op of ops) {
      if (op.op !== 'delete') continue
      const item = before.get(op.id)
      if (item?.note && item.refId) deletedNotes.set(item.refId, item.note)
    }
    const items = reduceOps(before, ops, clockNow(), noteLookup(before))
    // A card marked done with "Show done" off fades out first, then hides.
    const done = get().showDone
      ? []
      : ops.flatMap((op) => (op.op === 'setDone' && op.done ? [op.id] : []))
    const leaving = done.length > 0 ? new Set([...get().leaving, ...done]) : get().leaving
    syncGrid({ items, leaving, showDone: get().showDone }, opIds(ops))
    set({ items, leaving })
    if (done.length > 0) setTimeout(() => finishLeaving(done), DONE_EXIT_MS)
    pendingOps.push(...ops)
    queueSend()
    return inverse
  }

  const finishLeaving = (ids: readonly string[]): void => {
    const leaving = new Set(get().leaving)
    for (const id of ids) leaving.delete(id)
    const next = { ...get(), leaving }
    syncGrid(next, ids)
    set({ leaving })
    afterHistory?.(shownItems())
  }

  const cancelCamera = (): void => {
    if (cameraFrame) cancelAnimationFrame(cameraFrame)
    cameraFrame = 0
    cameraTarget = null
  }

  return {
    ready: false,
    items: new Map(),
    viewport: { x: 0, y: 0, zoom: 1 },
    size: { width: 0, height: 0 },
    tool: 'select',
    spaceHeld: false,
    panning: false,
    snap: true,
    showDone: false,
    leaving: new Set(),

    load: async () => {
      const token = ++loadToken
      const [rows, viewport, snap, showDone] = await Promise.all([
        window.sprawl.canvas.load(),
        window.sprawl.settings.get('viewport'),
        window.sprawl.settings.get('snap'),
        window.sprawl.settings.get('showDone'),
      ])
      if (token !== loadToken) return
      const items = new Map(rows.map((row) => [row.id, row]))
      const leaving = new Set<string>()
      syncGrid({ items, showDone, leaving })
      set({ ready: true, items, viewport, snap, showDone, leaving })
      afterHistory?.(shownItems())
    },

    unload: () => {
      get().flush()
      cancelCamera()
      loadToken++
      set({ ready: false, panning: false, spaceHeld: false })
    },

    apply: (ops, { record = true } = {}) => {
      if (ops.length === 0) return null
      const inverse = run(ops)
      return record && inverse.length > 0 ? canvasHistory.record(inverse) : null
    },

    undo: () => {
      const entry = canvasHistory.takeUndo()
      if (!entry) return
      canvasHistory.pushRedo(run(entry.ops), entry.id)
      afterHistory?.(shownItems())
    },

    redo: () => {
      const entry = canvasHistory.takeRedo()
      if (!entry) return
      canvasHistory.pushUndo(run(entry.ops), entry.id)
      afterHistory?.(shownItems())
    },

    undoStep: (id) => {
      if (canvasHistory.isLatest(id)) return get().undo()
      const entry = canvasHistory.remove(id)
      if (!entry) return
      // Later steps stay undoable; undoing this one becomes a step of its own.
      canvasHistory.record(run(entry.ops))
      afterHistory?.(shownItems())
    },

    renameNote: (itemId, title) => {
      const item = get().items.get(itemId)
      if (!item?.note || !item.refId || item.note.title === title) return
      const items = new Map(get().items)
      items.set(itemId, { ...item, note: { ...item.note, title } })
      set({ items })
      // The note's create may still be queued; it has to reach main first.
      if (flushQueued) sendOps()
      window.sprawl.notes.update(item.refId, { title }).catch((err: unknown) => {
        console.error('[canvas] rename failed; reloading', err)
        void get().load()
      })
    },

    syncNote: (noteId, fields) => {
      const id = get().cardOf(noteId)
      const item = id === null ? undefined : get().items.get(id)
      if (!item?.note) return
      const note = { ...item.note, ...fields }
      const keys = Object.keys(fields) as (keyof CardNote)[]
      if (keys.every((k) => note[k] === item.note?.[k])) return
      const items = new Map(get().items)
      items.set(item.id, { ...item, note })
      set({ items })
    },

    cardOf: (noteId) => {
      for (const item of get().items.values())
        if (item.kind === 'note' && item.refId === noteId) return item.id
      return null
    },

    setViewport: (viewport) => {
      cancelCamera()
      set({ viewport })
      saveViewport(viewport)
    },

    animateViewport: (to, ms) => {
      const { viewport: from, setViewport } = get()
      if (prefersReducedMotion() || ms <= 0) return setViewport(to)
      cancelCamera()
      cameraTarget = to
      const start = performance.now()
      const tick = (t: number): void => {
        const p = Math.min(1, (t - start) / ms)
        set({ viewport: lerpViewport(from, to, easeOut(p)) })
        if (p < 1) cameraFrame = requestAnimationFrame(tick)
        else {
          cameraFrame = 0
          cameraTarget = null
          saveViewport(to)
        }
      }
      cameraFrame = requestAnimationFrame(tick)
    },

    setSize: (size) => set({ size }),
    setTool: (tool) => set({ tool }),
    setSpaceHeld: (spaceHeld) => set({ spaceHeld }),
    setPanning: (panning) => set({ panning }),

    setShowDone: (showDone) => {
      // Saved even if it looks unchanged: Settings can flip it while the canvas isn't loaded.
      void window.sprawl.settings.set('showDone', showDone)
      if (showDone === get().showDone) return
      syncGrid({ ...get(), showDone })
      set({ showDone })
      afterHistory?.(shownItems())
    },

    flush: () => {
      if (flushQueued) sendOps()
      saveViewport.flush()
    },
  }
})
