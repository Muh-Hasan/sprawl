import { useSyncExternalStore } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { heightsVersion, renderedRect, subscribeHeights } from './measure'
import { boundsOf, type Rect } from './Viewport'

/** Above every card (z can be anything the user stacked up). */
const TOP = 2_147_483_647

/**
 * The dashed box around a multi-selection (DESIGN_SYSTEM §8), in world coordinates. It sits
 * just outside the cards' selection outlines.
 */
export function SelectionBox() {
  const selected = useSelectionStore((s) => s.selected)
  const transient = useSelectionStore((s) => s.transient)
  const items = useCanvasStore((s) => s.items)
  useSyncExternalStore(subscribeHeights, heightsVersion)

  if (selected.size < 2) return null
  const rects: Rect[] = []
  for (const id of selected) {
    const item = items.get(id)
    if (item) rects.push(renderedRect(item, transient?.get(id) ?? item))
  }
  const box = boundsOf(rects)
  if (!box) return null
  const pad = 'calc(6px * var(--inv-zoom, 1))'
  return (
    <div
      data-testid="selection-box"
      aria-hidden
      className="pointer-events-none absolute border-dashed border-border-strong"
      style={{
        left: `calc(${box.x}px - ${pad})`,
        top: `calc(${box.y}px - ${pad})`,
        width: `calc(${box.w}px + 2 * ${pad})`,
        height: `calc(${box.h}px + 2 * ${pad})`,
        borderWidth: 'calc(1px * var(--inv-zoom, 1))',
        zIndex: TOP,
      }}
    />
  )
}
