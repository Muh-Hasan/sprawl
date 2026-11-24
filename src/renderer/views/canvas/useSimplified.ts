import { useCanvasStore } from '@/stores/canvasStore'
import { SIMPLIFIED_BELOW } from './Viewport'

/**
 * The simplified-rendering hook (ARCHITECTURE §6): true below 40% zoom, where cards drop to
 * title-only blocks to stay fast. Only re-renders when the threshold is crossed.
 */
export function useSimplified(): boolean {
  return useCanvasStore((s) => s.viewport.zoom < SIMPLIFIED_BELOW)
}
