import { create } from 'zustand'
import type { CanvasOp, CardNote } from '@shared/types'
import { debounce } from '@/lib/debounce'
import { invertOps, reduceOps, type Items } from '@/views/canvas/ops'
import { SpatialGrid } from '@/views/canvas/spatial'
import { lerpViewport, type Size, type Viewport } from '@/views/canvas/Viewport'
import { canvasHistory } from './historyStore'

export type CanvasTool = 'select' | 'hand' | 'note'

/** The viewport is saved this long after it stops moving (and on blur or close). */
const VIEWPORT_SAVE_MS = 400

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

/** Brings the spatial grid in line with `items` for the ids that `ops` touched. */
function syncGrid(items: Items, ops: readonly CanvasOp[]): void {
  for (const op of ops) {
    const id = op.op === 'create' || op.op === 'restore' ? op.item.id : op.id
    const item = items.get(id)
    if (item) canvasGrid.set(id, item)
    else canvasGrid.delete(id)
  }
}

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
    window.sprawl.canvas.apply(ops).then(
      ({ created }) => {
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
    const items = reduceOps(before, ops, Date.now(), noteLookup(before))
    syncGrid(items, ops)
    set({ items })
    pendingOps.push(...ops)
    queueSend()
    return inverse
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

    load: async () => {
      const token = ++loadToken
      const [rows, viewport, snap] = await Promise.all([
        window.sprawl.canvas.load(),
        window.sprawl.settings.get('viewport'),
        window.sprawl.settings.get('snap'),
      ])
      if (token !== loadToken) return
      const items = new Map(rows.map((row) => [row.id, row]))
      canvasGrid.clear()
      for (const item of items.values()) canvasGrid.set(item.id, item)
      set({ ready: true, items, viewport, snap })
      afterHistory?.(items)
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
      afterHistory?.(get().items)
    },

    redo: () => {
      const entry = canvasHistory.takeRedo()
      if (!entry) return
      canvasHistory.pushUndo(run(entry.ops), entry.id)
      afterHistory?.(get().items)
    },

    undoStep: (id) => {
      if (canvasHistory.isLatest(id)) return get().undo()
      const entry = canvasHistory.remove(id)
      if (!entry) return
      // Later steps stay undoable; undoing this one becomes a step of its own.
      canvasHistory.record(run(entry.ops))
      afterHistory?.(get().items)
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

    flush: () => {
      if (flushQueued) sendOps()
      saveViewport.flush()
    },
  }
})
