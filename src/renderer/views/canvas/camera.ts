import { useCanvasStore, viewportTarget } from '@/stores/canvasStore'
import type { CanvasRect } from '@shared/types'
import { boundsOf, fitViewport, revealViewport, stepZoom, zoomAt } from './Viewport'

/**
 * Camera moves that glide rather than jump (DESIGN_SYSTEM §6): zoom steps, reset, zoom to fit
 * and bringing a new note into view. Wheel and drag input stay direct.
 */

/** Zoom steps and reset: quick enough to keep up with a held Ctrl+=. */
const STEP_MS = 180
/** Zoom to fit and jumping to a card. */
const JUMP_MS = 240

const canvas = () => useCanvasStore.getState()

function screenCenter() {
  const { size } = canvas()
  return { x: size.width / 2, y: size.height / 2 }
}

/** One zoom stop in or out around the middle of the canvas. Repeats build on the glide's end. */
export function zoomStep(dir: 1 | -1): void {
  const vp = viewportTarget()
  canvas().animateViewport(zoomAt(vp, screenCenter(), stepZoom(vp.zoom, dir)), STEP_MS)
}

/** Back to 100% around the middle of the canvas. */
export function zoomReset(): void {
  canvas().animateViewport(zoomAt(viewportTarget(), screenCenter(), 1), STEP_MS)
}

/** Fits every card in view. */
export function zoomToFit(): void {
  const { items, size } = canvas()
  canvas().animateViewport(fitViewport(boundsOf(items.values()), size), JUMP_MS)
}

/** Brings a card into view at a readable zoom (100% or more), if it isn't already. */
export function revealRect(rect: CanvasRect): void {
  const vp = viewportTarget()
  const next = revealViewport(vp, rect, canvas().size)
  if (next !== vp) canvas().animateViewport(next, JUMP_MS)
}
