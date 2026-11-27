import { memo, useEffect, useRef } from 'react'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { IconButton } from '@/components/IconButton'
import { TopBar } from '@/components/TopBar'
import { registerFlush } from '@/lib/flushes'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { CanvasContextMenu } from './ContextMenu'
import { EmptyCanvas } from './EmptyCanvas'
import { ItemLayer } from './ItemLayer'
import { Marquee } from './Marquee'
import { SelectionToolbar } from './SelectionToolbar'
import { StatusPill } from './StatusPill'
import { Toolbar } from './Toolbar'
import { useCanvasKeys } from './useCanvasKeys'
import { useSelectGestures } from './useSelectGestures'
import { useViewportGestures } from './useViewportGestures'
import { dotGridSpacing, dotLayerPosition, type Viewport } from './Viewport'
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
      // Selection outlines and handles divide by the zoom to stay the same size on screen.
      world.style.setProperty('--inv-zoom', String(1 / vp.zoom))
      const spacing = dotGridSpacing(vp.zoom)
      root.style.backgroundImage =
        'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1.2px)'
      root.style.backgroundSize = `${spacing}px ${spacing}px`
      root.style.backgroundPosition = `${dotLayerPosition(vp.x, spacing)}px ${dotLayerPosition(vp.y, spacing)}px`
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

/**
 * The canvas element never scrolls: the viewport is the world layer's transform. But focus and
 * find-in-page scroll even overflow-hidden boxes, which would shift every card away from where
 * the pointer math puts them, so any scroll is put straight back.
 */
function usePinnedScroll(ref: React.RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const pin = (): void => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0
      if (el.scrollTop !== 0) el.scrollTop = 0
    }
    el.addEventListener('scroll', pin)
    return () => el.removeEventListener('scroll', pin)
  }, [ref])
}

/**
 * Keeps the store's canvas size in step with the element (for culling and zooming at center).
 * It's measured once right away too: ResizeObserver only reports when a frame is drawn, which a
 * window in the background may not do for a while.
 */
function useCanvasSize(ref: React.RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    useCanvasStore.getState().setSize({ width, height })
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      useCanvasStore.getState().setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
}

/**
 * Loads the canvas on mount, and sends pending writes on blur, close and unmount. Leaving the
 * canvas also ends writing in a card: its editor is gone without a blur, and a stale edit would
 * reopen it (and take the note store from the panel) when the canvas comes back.
 */
function useCanvasLifecycle(): void {
  useEffect(() => {
    const { load, flush, unload } = useCanvasStore.getState()
    void load()
    const unregister = registerFlush(flush)
    window.addEventListener('blur', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      unregister()
      window.removeEventListener('blur', flush)
      window.removeEventListener('beforeunload', flush)
      unload()
      const selection = useSelectionStore.getState()
      selection.setEditing(null)
      selection.setBodyEditing(null)
    }
  }, [])
}

/** "Show done" in the canvas top bar (UI_SPEC §3): the same setting as in Settings. */
function ShowDoneToggle() {
  const showDone = useCanvasStore((s) => s.showDone)
  return (
    <IconButton
      data-testid="show-done-toggle"
      aria-pressed={showDone}
      icon={showDone ? IconEye : IconEyeOff}
      label={showDone ? 'Hide done notes' : 'Show done notes'}
      tooltipSide="bottom"
      active={showDone}
      size="sm"
      onClick={() => useCanvasStore.getState().setShowDone(!showDone)}
    />
  )
}

/** The canvas (UI_SPEC §4): an endless dotted board, panned and zoomed. */
export function Canvas() {
  const rootRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const ready = useCanvasStore((s) => s.ready)
  const grab = useCanvasStore((s) => s.tool === 'hand' || s.spaceHeld)
  const crosshair = useCanvasStore((s) => s.tool === 'note')
  const panning = useCanvasStore((s) => s.panning)

  useCanvasLifecycle()
  useCanvasSize(rootRef)
  usePinnedScroll(rootRef)
  useViewportDom(rootRef, worldRef)
  useViewportGestures(rootRef)
  useSelectGestures(rootRef)
  useCanvasKeys()

  return (
    <CanvasContextMenu>
      <div
        ref={rootRef}
        data-testid="canvas"
        data-ready={ready || undefined}
        className={cn(
          'relative h-full overflow-hidden bg-background select-none',
          panning
            ? 'cursor-grabbing'
            : grab
              ? 'cursor-grab'
              : crosshair
                ? 'cursor-crosshair'
                : 'cursor-default',
        )}
      >
        <div
          ref={worldRef}
          data-testid="canvas-world"
          className="absolute top-0 left-0 origin-top-left"
        >
          {ready && <MemoItemLayer />}
        </div>
        {/* The top bar is transparent on the canvas. */}
        <div data-canvas-chrome className="absolute inset-x-0 top-0">
          <TopBar transparent right={ready && <ShowDoneToggle />} />
        </div>
        <EmptyCanvas />
        <Marquee />
        <SelectionToolbar />
        <Toolbar />
        <StatusPill />
        <ZoomControls />
      </div>
    </CanvasContextMenu>
  )
}
