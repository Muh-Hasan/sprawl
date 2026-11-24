import { IconMinus, IconPlus } from '@tabler/icons-react'
import { HintTooltip } from '@/components/HintTooltip'
import { IconButton } from '@/components/IconButton'
import { CANVAS_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { useCanvasStore } from '@/stores/canvasStore'
import { zoomLabel } from './Viewport'

const STEP_BUTTON = "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3.5"

/** The bottom-right zoom pill (UI_SPEC §4.4): −, the percentage (click to reset) and +. */
export function ZoomControls() {
  const label = useCanvasStore((s) => zoomLabel(s.viewport.zoom))
  const zoomStep = useCanvasStore((s) => s.zoomStep)
  const zoomReset = useCanvasStore((s) => s.zoomReset)
  return (
    <div
      data-testid="zoom-controls"
      data-canvas-chrome
      className="absolute right-3 bottom-3 z-10 flex h-7 items-center rounded-lg border border-border bg-card px-0.5"
    >
      <IconButton
        data-testid="zoom-out"
        icon={IconMinus}
        label="Zoom out"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.zoomOut)}
        tooltipSide="top"
        className={STEP_BUTTON}
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
          className="h-6 w-11 rounded-md text-center font-mono text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
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
        className={STEP_BUTTON}
        onClick={() => zoomStep(1)}
      />
    </div>
  )
}
