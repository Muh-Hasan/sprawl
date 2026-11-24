import { useEffect, type RefObject } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import { panBy, wheelDeltaPx, wheelZoomFactor, zoomAt, type Viewport } from './Viewport'

/**
 * Pan and zoom input on the canvas element (PRODUCT §3.1, ARCHITECTURE §6). Wheel input works
 * over the whole canvas, floating controls included; drags only start on the board itself.
 *
 * - wheel pans; ctrl+wheel (also what a touchpad pinch sends) zooms around the cursor
 * - a middle-mouse drag pans, and so does a left drag in Hand mode or with space held
 *
 * Input events can arrive faster than the screen refreshes, so they're folded into one
 * viewport update per animation frame.
 */
export function useViewportGestures(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const store = useCanvasStore

    let pending: Viewport | null = null
    let frame = 0
    const update = (fn: (vp: Viewport) => Viewport): void => {
      pending = fn(pending ?? store.getState().viewport)
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0
          if (pending) store.getState().setViewport(pending)
          pending = null
        })
      }
    }

    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    // Non-passive, so ctrl+wheel (pinch) can't zoom the page instead (ARCHITECTURE §2).
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const page = el.clientHeight
      let dx = wheelDeltaPx(e.deltaX, e.deltaMode, page)
      let dy = wheelDeltaPx(e.deltaY, e.deltaMode, page)
      if (e.ctrlKey) {
        const anchor = local(e)
        update((vp) => zoomAt(vp, anchor, vp.zoom * wheelZoomFactor(dy)))
        return
      }
      // Shift+wheel on a mouse scrolls sideways.
      if (e.shiftKey && dx === 0) [dx, dy] = [dy, 0]
      update((vp) => panBy(vp, -dx, -dy))
    }

    let panPointer: number | null = null
    let last = { x: 0, y: 0 }

    const onPointerDown = (e: PointerEvent): void => {
      // The toolbar, zoom pill and top bar sit over the board but aren't part of it.
      if (e.target instanceof Element && e.target.closest('[data-canvas-chrome]')) return
      const { tool, spaceHeld } = store.getState()
      const panButton = e.button === 1 || (e.button === 0 && (tool === 'hand' || spaceHeld))
      if (!panButton || panPointer !== null) return
      e.preventDefault()
      el.setPointerCapture(e.pointerId)
      panPointer = e.pointerId
      last = { x: e.clientX, y: e.clientY }
      store.getState().setPanning(true)
    }

    const onPointerMove = (e: PointerEvent): void => {
      if (e.pointerId !== panPointer) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      last = { x: e.clientX, y: e.clientY }
      update((vp) => panBy(vp, dx, dy))
    }

    const endPan = (e: PointerEvent): void => {
      if (e.pointerId !== panPointer) return
      panPointer = null
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      store.getState().setPanning(false)
    }

    // Stops Chromium's middle-click autoscroll.
    const onMouseDown = (e: MouseEvent): void => {
      if (e.button === 1) e.preventDefault()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endPan)
    el.addEventListener('pointercancel', endPan)
    el.addEventListener('mousedown', onMouseDown)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endPan)
      el.removeEventListener('pointercancel', endPan)
      el.removeEventListener('mousedown', onMouseDown)
      if (frame) cancelAnimationFrame(frame)
      if (pending) store.getState().setViewport(pending)
      store.getState().setPanning(false)
    }
  }, [ref])
}
