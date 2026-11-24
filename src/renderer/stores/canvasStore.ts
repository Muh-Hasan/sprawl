import { create } from 'zustand'
import type { CanvasItem, CanvasOp } from '@shared/types'
import { debounce } from '@/lib/debounce'
import { SpatialGrid } from '@/views/canvas/spatial'
import {
  boundsOf,
  fitViewport,
  lerpViewport,
  stepZoom,
  zoomAt,
  type Size,
  type Viewport,
} from '@/views/canvas/Viewport'

export type CanvasTool = 'select' | 'hand'

/** The viewport is saved this long after it stops moving (and on blur or close). */
const VIEWPORT_SAVE_MS = 400
const FIT_MS = 240

type Items = ReadonlyMap<string, CanvasItem>

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
  /** Loads the cards and the saved viewport for the open vault. */
  load(): Promise<void>
  /** Sends what's pending and forgets the loaded state (the canvas view closed). */
  unload(): void
  /** Applies ops locally right away, then persists them in one batched `canvas.apply`. */
  apply(ops: CanvasOp[]): void
  /** Moves the view (not animated). Saving is debounced. */
  setViewport(vp: Viewport): void
  /** Zooms one stop in or out around the middle of the canvas. */
  zoomStep(dir: 1 | -1): void
  /** Back to 100% around the middle of the canvas. */
  zoomReset(): void
  /** Fits every card in view, animated over 240ms. */
  zoomToFit(): void
  setSize(size: Size): void
  setTool(tool: CanvasTool): void
  setSpaceHeld(held: boolean): void
  setPanning(panning: boolean): void
  /** Sends the pending ops and viewport now (on blur, unmount and close). */
  flush(): void
}

/** The spatial index of the loaded cards, kept in step with `items` (not reactive state). */
export const canvasGrid = new SpatialGrid()

/** Applies ops to a copy of `items` (the optimistic local copy of what main will store). */
export function reduceOps(items: Items, ops: readonly CanvasOp[], now = Date.now()): Items {
  const next = new Map(items)
  for (const op of ops) {
    switch (op.op) {
      case 'create': {
        const note = op.note ? { title: op.note.title, color: op.note.color } : undefined
        next.set(op.item.id, { ...op.item, createdAt: now, updatedAt: now, ...(note && { note }) })
        break
      }
      case 'update': {
        const item = next.get(op.id)
        if (item) next.set(op.id, { ...item, ...op.patch, updatedAt: now })
        break
      }
      case 'delete':
        next.delete(op.id)
        break
    }
  }
  return next
}

/** Brings the spatial grid in line with `items` for the ids that `ops` touched. */
function syncGrid(items: Items, ops: readonly CanvasOp[]): void {
  for (const op of ops) {
    const id = op.op === 'create' ? op.item.id : op.id
    const item = items.get(id)
    if (item) canvasGrid.set(id, item)
    else canvasGrid.delete(id)
  }
}

let pendingOps: CanvasOp[] = []
let flushQueued = false
let fitFrame = 0
/** Bumped by every load and unload, so a load that finishes late is dropped. */
let loadToken = 0

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
        const items = new Map(get().items)
        for (const row of created) if (items.has(row.id)) items.set(row.id, row)
        set({ items })
      },
      (err: unknown) => {
        // Main rejected the batch (rolled back), so reload what's really stored.
        console.error('[canvas] apply failed; reloading', err)
        void get().load()
      },
    )
  }

  const center = (): { x: number; y: number } => ({
    x: get().size.width / 2,
    y: get().size.height / 2,
  })

  const cancelFit = (): void => {
    if (fitFrame) cancelAnimationFrame(fitFrame)
    fitFrame = 0
  }

  return {
    ready: false,
    items: new Map(),
    viewport: { x: 0, y: 0, zoom: 1 },
    size: { width: 0, height: 0 },
    tool: 'select',
    spaceHeld: false,
    panning: false,

    load: async () => {
      const token = ++loadToken
      const [rows, viewport] = await Promise.all([
        window.sprawl.canvas.load(),
        window.sprawl.settings.get('viewport'),
      ])
      if (token !== loadToken) return
      const items = new Map(rows.map((row) => [row.id, row]))
      canvasGrid.clear()
      for (const item of items.values()) canvasGrid.set(item.id, item)
      set({ ready: true, items, viewport })
    },

    unload: () => {
      get().flush()
      cancelFit()
      loadToken++
      set({ ready: false, panning: false, spaceHeld: false })
    },

    apply: (ops) => {
      if (ops.length === 0) return
      const items = reduceOps(get().items, ops)
      syncGrid(items, ops)
      set({ items })
      pendingOps.push(...ops)
      if (!flushQueued) {
        flushQueued = true
        queueMicrotask(sendOps)
      }
    },

    setViewport: (viewport) => {
      cancelFit()
      set({ viewport })
      saveViewport(viewport)
    },

    zoomStep: (dir) => {
      const { viewport, setViewport } = get()
      setViewport(zoomAt(viewport, center(), stepZoom(viewport.zoom, dir)))
    },

    zoomReset: () => {
      const { viewport, setViewport } = get()
      setViewport(zoomAt(viewport, center(), 1))
    },

    zoomToFit: () => {
      const { items, size, viewport: from, setViewport } = get()
      const to = fitViewport(boundsOf(items.values()), size)
      if (prefersReducedMotion()) return setViewport(to)
      cancelFit()
      const start = performance.now()
      const tick = (t: number): void => {
        const p = Math.min(1, (t - start) / FIT_MS)
        set({ viewport: lerpViewport(from, to, easeOut(p)) })
        if (p < 1) fitFrame = requestAnimationFrame(tick)
        else {
          fitFrame = 0
          saveViewport(to)
        }
      }
      fitFrame = requestAnimationFrame(tick)
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
