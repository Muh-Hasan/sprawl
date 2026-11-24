import { memo, useEffect, useRef } from 'react'
import { TopBar } from '@/components/TopBar'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'
import { ItemLayer } from './ItemLayer'
import { Toolbar } from './Toolbar'
import { useCanvasKeys } from './useCanvasKeys'
import { useViewportGestures } from './useViewportGestures'
import { dotGridSpacing, type Viewport } from './Viewport'
import { ZoomControls } from './ZoomControls'

/** How long after the last pan or zoom the world layer stays promoted (see `useViewportDom`). */
const SETTLE_MS = 150

const MemoItemLayer = memo(ItemLayer)

/**
 * Writes the viewport straight to the DOM rather than through React, so a pan only touches
 * two style properties per frame: the world layer's transform and the dot grid's position.
 */
function useViewportDom(
  rootRef: React.RefObject<HTMLDivElement | null>,
  worldRef: React.RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    const root = rootRef.current
    const world = worldRef.current
    if (!root || !world) return
    let settle: ReturnType<typeof setTimeout> | undefined

    const write = (vp: Viewport, moving: boolean): void => {
      world.style.transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`
      const spacing = dotGridSpacing(vp.zoom)
      root.style.backgroundImage = spacing
        ? 'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1.2px)'
        : 'none'
      if (spacing) {
        root.style.backgroundSize = `${spacing}px ${spacing}px`
        root.style.backgroundPosition = `${vp.x}px ${vp.y}px`
      }
      root.dataset.x = String(vp.x)
      root.dataset.y = String(vp.y)
      root.dataset.zoom = String(vp.zoom)
      // While moving, the world is its own compositor layer so frames are cheap. Once it
      // settles the hint is dropped, so text re-rasterizes crisply at the new zoom.
      if (!moving) return
      world.style.willChange = 'transform'
      clearTimeout(settle)
      settle = setTimeout(() => (world.style.willChange = ''), SETTLE_MS)
    }

    write(useCanvasStore.getState().viewport, false)
    const unsubscribe = useCanvasStore.subscribe((s, prev) => {
      if (s.viewport !== prev.viewport) write(s.viewport, true)
    })
    return () => {
      unsubscribe()
      clearTimeout(settle)
    }
  }, [rootRef, worldRef])
}

/** Keeps the store's canvas size in step with the element (for culling and zooming at center). */
function useCanvasSize(ref: React.RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      useCanvasStore.getState().setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
}

/** Loads the canvas on mount, and sends pending writes on blur, close and unmount. */
function useCanvasLifecycle(): void {
  useEffect(() => {
    const { load, flush, unload } = useCanvasStore.getState()
    void load()
    window.addEventListener('blur', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('blur', flush)
      window.removeEventListener('beforeunload', flush)
      unload()
    }
  }, [])
}

/** The canvas (UI_SPEC §4): an endless dotted board, panned and zoomed. */
export function Canvas() {
  const rootRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const ready = useCanvasStore((s) => s.ready)
  const grab = useCanvasStore((s) => s.tool === 'hand' || s.spaceHeld)
  const panning = useCanvasStore((s) => s.panning)

  useCanvasLifecycle()
  useCanvasSize(rootRef)
  useViewportDom(rootRef, worldRef)
  useViewportGestures(rootRef)
  useCanvasKeys()

  return (
    <div
      ref={rootRef}
      data-testid="canvas"
      data-ready={ready || undefined}
      className={cn(
        'relative h-full overflow-hidden bg-background select-none',
        panning ? 'cursor-grabbing' : grab ? 'cursor-grab' : 'cursor-default',
      )}
    >
      <div
        ref={worldRef}
        data-testid="canvas-world"
        className="absolute top-0 left-0 origin-top-left"
      >
        {ready && <MemoItemLayer />}
      </div>
      {/* The top bar is transparent on the canvas. later: phase-5 adds "Show done". */}
      <div data-canvas-chrome className="absolute inset-x-0 top-0">
        <TopBar transparent />
      </div>
      <Toolbar />
      <ZoomControls />
    </div>
  )
}
