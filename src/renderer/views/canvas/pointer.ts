import { useEffect } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import { screenToWorld, type Point } from './Viewport'

/** Where the pointer last was over the canvas, in canvas px, or null once it has left. */
let last: Point | null = null

/**
 * Keeps track of the pointer over the canvas, so Ctrl+V can put the note under it. A module
 * variable rather than store state: it changes on every move and nothing renders from it.
 */
export function usePointerSpot(ref: React.RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const move = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect()
      last = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const leave = (): void => {
      last = null
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      last = null
    }
  }, [ref])
}

/** The world point under the pointer, or null when it isn't over the canvas. */
export function pointerWorld(): Point | null {
  return last && screenToWorld(useCanvasStore.getState().viewport, last)
}
