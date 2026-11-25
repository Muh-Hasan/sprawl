import { create } from 'zustand'
import type { CanvasOp, CanvasRect } from '@shared/types'
import type { Items } from '@/views/canvas/ops'
import type { Rect } from '@/views/canvas/Viewport'
import { onHistoryApplied, useCanvasStore } from './canvasStore'

/** A pointer or key gesture that changes card rects: shown live, written once at the end. */
export type Gesture = 'move' | 'resize' | 'nudge'

interface SelectionState {
  selected: ReadonlySet<string>
  /** The card whose title is being edited inline. */
  editing: string | null
  /**
   * Rects that stand in for the stored ones while a gesture runs. They change at frame rate and
   * never touch the DB; `commitGesture` turns them into one `canvas.apply` (ARCHITECTURE §6).
   */
  transient: ReadonlyMap<string, CanvasRect> | null
  gesture: Gesture | null
  /** The marquee being dragged, in screen px relative to the canvas. */
  marquee: Rect | null
  /** A marquee selects; a draft is a note being drawn with the Note tool. */
  marqueeKind: 'select' | 'draft'
  /** Replaces the selection, adds to it, or toggles each id in or out. */
  select(ids: Iterable<string>, mode?: 'replace' | 'add' | 'toggle'): void
  clear(): void
  setEditing(id: string | null): void
  setMarquee(rect: Rect | null, kind?: 'select' | 'draft'): void
  /** Starts a gesture on the given cards, from their current rects. */
  beginGesture(gesture: Gesture, rects: ReadonlyMap<string, CanvasRect>): void
  setTransient(rects: ReadonlyMap<string, CanvasRect>): void
  /** Writes the changed rects in one recorded batch, and ends the gesture. */
  commitGesture(): void
  /** Ends the gesture without writing anything. */
  cancelGesture(): void
  /** Drops the ids that are no longer on the canvas. */
  prune(items: Items): void
}

const EMPTY: ReadonlySet<string> = new Set()

/** The update ops that move each card to its transient rect (cards that didn't change are skipped). */
export function gestureOps(items: Items, rects: ReadonlyMap<string, CanvasRect>): CanvasOp[] {
  const ops: CanvasOp[] = []
  for (const [id, rect] of rects) {
    const item = items.get(id)
    if (!item) continue
    const patch: Partial<CanvasRect> = {}
    for (const key of ['x', 'y', 'w', 'h'] as const)
      if (item[key] !== rect[key]) patch[key] = rect[key]
    if (Object.keys(patch).length > 0) ops.push({ op: 'update', id, patch })
  }
  return ops
}

export const useSelectionStore = create<SelectionState>()((set, get) => ({
  selected: EMPTY,
  editing: null,
  transient: null,
  gesture: null,
  marquee: null,
  marqueeKind: 'select',

  select: (ids, mode = 'replace') => {
    const next = new Set(mode === 'replace' ? [] : get().selected)
    for (const id of ids) {
      if (mode === 'toggle' && next.has(id)) next.delete(id)
      else next.add(id)
    }
    set({ selected: next })
  },

  clear: () => {
    if (get().selected.size > 0) set({ selected: EMPTY })
  },

  setEditing: (editing) => set({ editing }),
  setMarquee: (marquee, marqueeKind = 'select') => set({ marquee, marqueeKind }),

  beginGesture: (gesture, rects) => set({ gesture, transient: rects }),
  setTransient: (transient) => {
    if (get().gesture) set({ transient })
  },

  commitGesture: () => {
    const { transient } = get()
    set({ gesture: null, transient: null })
    if (!transient) return
    const { items, apply } = useCanvasStore.getState()
    apply(gestureOps(items, transient))
  },

  cancelGesture: () => set({ gesture: null, transient: null }),

  prune: (items) => {
    const { selected, editing } = get()
    const kept = [...selected].filter((id) => items.has(id))
    if (kept.length !== selected.size) set({ selected: new Set(kept) })
    if (editing && !items.has(editing)) set({ editing: null })
  },
}))

onHistoryApplied((items) => useSelectionStore.getState().prune(items))
