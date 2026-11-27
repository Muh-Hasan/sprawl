import { useRef } from 'react'
import { PANEL_WIDTH } from '@shared/constants'

/** How far one arrow key moves the edge. */
const KEY_STEP = 16

interface PanelResizeHandleProps {
  width: number
  /** The new width, live while dragging (the frame clamps it). */
  onResize(px: number): void
  /** The width to save: `now` at the end of a drag, debounced for arrow keys. */
  onCommit(px: number, now: boolean): void
}

/**
 * The floating panel's left edge (UI_SPEC §5): a 6px hit area along the border that shows a
 * 2px `--border-strong` line on hover or while dragging. Dragging it left widens the panel;
 * with focus, ← and → do the same in 16px steps.
 */
export function PanelResizeHandle({ width, onResize, onCommit }: PanelResizeHandleProps) {
  const drag = useRef<{ x: number; width: number; last: number } | null>(null)

  const clamp = (px: number): number =>
    Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, Math.round(px)))

  return (
    <div
      data-testid="note-panel-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the note panel"
      aria-valuemin={PANEL_WIDTH.min}
      aria-valuemax={PANEL_WIDTH.max}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        e.currentTarget.dataset.dragging = ''
        drag.current = { x: e.clientX, width, last: width }
      }}
      onPointerMove={(e) => {
        const start = drag.current
        if (!start) return
        start.last = clamp(start.width + start.x - e.clientX)
        onResize(start.last)
      }}
      onPointerUp={(e) => {
        const start = drag.current
        if (!start) return
        drag.current = null
        delete e.currentTarget.dataset.dragging
        onCommit(start.last, true)
      }}
      onLostPointerCapture={(e) => {
        const start = drag.current
        if (!start) return
        drag.current = null
        delete e.currentTarget.dataset.dragging
        onCommit(start.last, true)
      }}
      onKeyDown={(e) => {
        const step = e.key === 'ArrowLeft' ? KEY_STEP : e.key === 'ArrowRight' ? -KEY_STEP : 0
        if (step === 0) return
        e.preventDefault()
        e.stopPropagation()
        const next = clamp(width + step)
        onResize(next)
        onCommit(next, false)
      }}
      className="group/handle absolute inset-y-4 -left-[3px] z-10 w-1.5 cursor-col-resize outline-none"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0.5 w-0.5 rounded-full transition-colors group-hover/handle:bg-border-strong group-focus-visible/handle:bg-ring group-data-[dragging]/handle:bg-border-strong" />
    </div>
  )
}
