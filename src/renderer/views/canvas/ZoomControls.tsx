import { IconArrowsMaximize, IconMinus, IconPlus } from '@tabler/icons-react'
import { HintTooltip } from '@/components/HintTooltip'
import { IconButton } from '@/components/IconButton'
import { CANVAS_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { useCanvasStore } from '@/stores/canvasStore'
import { zoomReset, zoomStep, zoomToFit } from './camera'
import { zoomLabel } from './Viewport'

const PILL_BUTTON = "h-[30px] w-8 rounded-lg [&_svg:not([class*='size-'])]:size-4"

/**
 * The bottom-right zoom pill (UI_SPEC §4.4): −, the percentage (click to reset), + and Zoom to
 * fit. Like the toolbar, it stays clear of anything floating over the canvas's right edge.
 */
export function ZoomControls() {
  const label = useCanvasStore((s) => zoomLabel(s.viewport.zoom))

  return (
    <div
      data-testid="zoom-controls"
      data-canvas-chrome
      className="absolute right-[calc(var(--canvas-inset-right,0px)_+_16px)] bottom-4 z-10 flex h-9 items-center rounded-[10px] border border-border bg-card px-0.5 transition-[right] duration-240 ease-(--ease-out)"
    >
      <IconButton
        data-testid="zoom-out"
        icon={IconMinus}
        label="Zoom out"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.zoomOut)}
        tooltipSide="top"
        className={PILL_BUTTON}
        onClick={() => zoomStep(-1)}
      />
      <HintTooltip
        label="Reset zoom"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.zoomReset)}
        side="top"
      >
        <button
          type="button"
          data-testid="zoom-reset"
          aria-label={`Zoom ${label}, reset to 100%`}
          className="h-[30px] w-12 rounded-lg text-center font-mono text-2xs font-normal text-foreground/85 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={zoomReset}
        >
          {label}
        </button>
      </HintTooltip>
      <IconButton
        data-testid="zoom-in"
        icon={IconPlus}
        label="Zoom in"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.zoomIn)}
        tooltipSide="top"
        className={PILL_BUTTON}
        onClick={() => zoomStep(1)}
      />
      <div aria-hidden className="mx-0.5 h-[18px] w-px bg-border" />
      <IconButton
        data-testid="zoom-fit"
        icon={IconArrowsMaximize}
        label="Zoom to fit"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.zoomFit)}
        tooltipSide="top"
        className={PILL_BUTTON}
        onClick={zoomToFit}
      />
    </div>
  )
}
