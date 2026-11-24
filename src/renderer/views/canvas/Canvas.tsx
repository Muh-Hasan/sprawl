import { TopBar } from '@/components/TopBar'

/**
 * The canvas (UI_SPEC §4). Its top bar is transparent and borderless, laid over the canvas so
 * the board runs full-bleed. later: phase-2 adds the viewport, dot grid, toolbar and zoom pill;
 * phase-5 the "Show done" toggle in the top bar.
 */
export function Canvas() {
  return (
    <div className="relative h-full overflow-hidden">
      <div data-testid="canvas" className="absolute inset-0 bg-background" />
      <div className="absolute inset-x-0 top-0">
        <TopBar transparent />
      </div>
    </div>
  )
}
