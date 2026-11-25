import { useEffect, type RefObject } from 'react'
import type { CanvasRect } from '@shared/types'
import { isTypingTarget } from '@/lib/shortcuts'
import { canvasGrid, useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { createNoteAt, createNoteIn } from './actions'
import { renderedRect } from './measure'
import {
  intersects,
  NOTE_SIZE,
  rectFromPoints,
  resizeRect,
  snapMove,
  type Corner,
  drawnNoteRect,
} from './ops'
import { screenToWorld, worldToScreen, type Point } from './Viewport'

/** A press turns into a drag after this many screen px, so a click never moves a card. */
const DRAG_THRESHOLD = 3

type Drag =
  | {
      kind: 'press' | 'move'
      pointer: number
      startScreen: Point
      startWorld: Point
      /** The grabbed card: its top-left is what snaps to the grid. */
      anchor: string
      origins: ReadonlyMap<string, CanvasRect>
      /** A plain click on a card of a multi-selection selects just that card. */
      selectOnlyOnClick: boolean
    }
  | {
      kind: 'resize'
      pointer: number
      startWorld: Point
      id: string
      corner: Corner
      origin: CanvasRect
    }
  | { kind: 'marquee'; pointer: number; startWorld: Point; base: ReadonlySet<string> }
  /** The Note tool: a click places a default note, a drag draws one at that size. */
  | { kind: 'draw'; pointer: number; startScreen: Point; startWorld: Point; drawn: boolean }

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((id) => b.has(id))

/**
 * Left-button input on the board with the Select and Note tools (PRODUCT §3.1): click and
 * Shift+click select, drags move the selection (snapped unless Alt is held), corner handles
 * resize, a drag on empty space draws a marquee, and double-clicks create notes or edit a
 * title. Panning (Hand, space, middle button) is `useViewportGestures`.
 *
 * Moves and resizes only change the transient rects; one `canvas.apply` goes out on pointerup.
 */
export function useSelectGestures(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const canvas = useCanvasStore
    const sel = useSelectionStore
    let drag: Drag | null = null
    // Pointer moves can outpace the screen; only the latest one per frame is applied.
    let pendingMove: PointerEvent | null = null
    let moveFrame = 0

    const local = (e: MouseEvent): Point => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const world = (e: MouseEvent): Point => screenToWorld(canvas.getState().viewport, local(e))

    /** Not for us: the floating chrome, panning, or typing in a title. */
    const ignored = (target: EventTarget | null): boolean => {
      if (target instanceof Element && target.closest('[data-canvas-chrome]')) return true
      const { tool, spaceHeld } = canvas.getState()
      return tool === 'hand' || spaceHeld || isTypingTarget(target)
    }

    const cardAt = (target: EventTarget | null): { id: string; handle: Corner | null } | null => {
      if (!(target instanceof Element)) return null
      const card = target.closest<HTMLElement>('[data-card-id]')
      const id = card?.dataset.cardId
      if (!id || !canvas.getState().items.has(id)) return null
      const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle
      return { id, handle: (handle as Corner | undefined) ?? null }
    }

    const selectedRects = (): Map<string, CanvasRect> => {
      const { items } = canvas.getState()
      const rects = new Map<string, CanvasRect>()
      for (const id of sel.getState().selected) {
        const item = items.get(id)
        if (item) rects.set(id, { x: item.x, y: item.y, w: item.w, h: item.h })
      }
      return rects
    }

    const onPointerDown = (e: PointerEvent): void => {
      if (e.button !== 0 || drag || ignored(e.target)) return
      const s = sel.getState()
      const hit = cardAt(e.target)
      const pointer = e.pointerId
      const startWorld = world(e)

      if (hit?.handle) {
        const item = canvas.getState().items.get(hit.id)!
        drag = {
          kind: 'resize',
          pointer,
          startWorld,
          id: hit.id,
          corner: hit.handle,
          origin: renderedRect(item),
        }
        s.beginGesture('resize', new Map([[hit.id, drag.origin]]))
      } else if (hit) {
        let selectOnlyOnClick = false
        if (e.shiftKey) {
          s.select([hit.id], 'toggle')
          if (!sel.getState().selected.has(hit.id)) return
        } else if (!s.selected.has(hit.id)) s.select([hit.id])
        else selectOnlyOnClick = s.selected.size > 1
        drag = {
          kind: 'press',
          pointer,
          startScreen: local(e),
          startWorld,
          anchor: hit.id,
          origins: selectedRects(),
          selectOnlyOnClick,
        }
      } else if (canvas.getState().tool === 'note') {
        // Cancelling the press keeps the browser from moving focus away from the new title.
        e.preventDefault()
        s.clear()
        drag = { kind: 'draw', pointer, startScreen: local(e), startWorld, drawn: false }
      } else {
        const base = e.shiftKey ? s.selected : new Set<string>()
        if (!e.shiftKey) s.clear()
        drag = { kind: 'marquee', pointer, startWorld, base }
      }
      el.setPointerCapture(pointer)
    }

    const applyMove = (e: PointerEvent): void => {
      if (!drag || e.pointerId !== drag.pointer) return
      const s = sel.getState()
      const { snap, viewport, items } = canvas.getState()
      const now = world(e)
      const dx = now.x - drag.startWorld.x
      const dy = now.y - drag.startWorld.y
      const snapping = snap && !e.altKey

      switch (drag.kind) {
        case 'press':
        case 'move': {
          if (drag.kind === 'press') {
            const p = local(e)
            const moved = Math.hypot(p.x - drag.startScreen.x, p.y - drag.startScreen.y)
            if (moved < DRAG_THRESHOLD) return
            drag.kind = 'move'
            s.beginGesture('move', drag.origins)
          }
          const anchor = drag.origins.get(drag.anchor)
          if (!anchor) return
          const d = snapMove(anchor, dx, dy, snapping)
          const next = new Map<string, CanvasRect>()
          for (const [id, r] of drag.origins) next.set(id, { ...r, x: r.x + d.dx, y: r.y + d.dy })
          s.setTransient(next)
          return
        }
        case 'resize': {
          const rect = resizeRect(drag.origin, drag.corner, dx, dy, NOTE_SIZE, snapping)
          s.setTransient(new Map([[drag.id, rect]]))
          return
        }
        case 'draw': {
          const p = local(e)
          if (!drag.drawn) {
            if (Math.hypot(p.x - drag.startScreen.x, p.y - drag.startScreen.y) < DRAG_THRESHOLD)
              return
            drag.drawn = true
          }
          const r = drawnNoteRect(drag.startWorld, now, snapping)
          const a = worldToScreen(viewport, r)
          s.setMarquee({ x: a.x, y: a.y, w: r.w * viewport.zoom, h: r.h * viewport.zoom }, 'draft')
          return
        }
        case 'marquee': {
          const area = rectFromPoints(drag.startWorld, now)
          const a = worldToScreen(viewport, drag.startWorld)
          s.setMarquee(rectFromPoints(a, local(e)))
          const next = new Set(drag.base)
          for (const id of canvasGrid.query(area)) {
            const item = items.get(id)
            if (item && intersects(renderedRect(item), area)) next.add(id)
          }
          if (!sameSet(next, s.selected)) s.select(next)
          return
        }
      }
    }

    const flushMove = (): void => {
      if (moveFrame) cancelAnimationFrame(moveFrame)
      moveFrame = 0
      const e = pendingMove
      pendingMove = null
      if (e) applyMove(e)
    }

    const onPointerMove = (e: PointerEvent): void => {
      if (!drag || e.pointerId !== drag.pointer) return
      pendingMove = e
      if (!moveFrame) moveFrame = requestAnimationFrame(flushMove)
    }

    const end = (e: PointerEvent, cancelled: boolean): void => {
      if (!cancelled) flushMove()
      else pendingMove = null
      if (!drag || e.pointerId !== drag.pointer) return
      const s = sel.getState()
      const done = drag
      drag = null
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      switch (done.kind) {
        case 'press':
          if (!cancelled && done.selectOnlyOnClick) s.select([done.anchor])
          break
        case 'move':
        case 'resize':
          if (cancelled) s.cancelGesture()
          else s.commitGesture()
          break
        case 'marquee':
          s.setMarquee(null)
          break
        case 'draw': {
          s.setMarquee(null)
          if (cancelled) break
          const { snap } = canvas.getState()
          const end = world(e)
          if (done.drawn)
            createNoteIn(drawnNoteRect(done.startWorld, end, snap && !e.altKey), { edit: true })
          else createNoteAt(done.startWorld, { edit: true })
          canvas.getState().setTool('select')
          break
        }
      }
    }
    const onPointerUp = (e: PointerEvent): void => end(e, false)
    const onPointerCancel = (e: PointerEvent): void => end(e, true)

    const onDoubleClick = (e: MouseEvent): void => {
      // The board holds pointer capture from the press, so the event is aimed at the board
      // itself; what was double-clicked is whatever is under the pointer.
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (e.button !== 0 || ignored(target)) return
      const hit = cardAt(target)
      if (!hit) {
        createNoteAt(world(e), { edit: true })
        return
      }
      // later: phase-4 opens the note panel on a double-click off the title (UI_SPEC §4.5).
      // Until then the whole card edits its title, so a double-click is never a dead end.
      sel.getState().select([hit.id])
      sel.getState().setEditing(hit.id)
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)
    el.addEventListener('dblclick', onDoubleClick)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
      el.removeEventListener('dblclick', onDoubleClick)
      if (moveFrame) cancelAnimationFrame(moveFrame)
      sel.getState().cancelGesture()
      sel.getState().setMarquee(null)
    }
  }, [ref])
}
