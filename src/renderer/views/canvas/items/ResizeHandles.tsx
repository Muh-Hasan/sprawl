import { CORNERS, type Corner } from '../ops'

/**
 * Where each handle sits: centered on the selection outline's corner. Positions count from
 * inside the card's 1px border (world px); the outline is 3.5px out plus half its 1.5px width,
 * and the handle is 9px, all in screen px, so those are divided by the zoom (`--inv-zoom`, set
 * on the world layer).
 */
const OFFSET = 'calc(-1px - 8.75px * var(--inv-zoom, 1))'
const POSITION: Record<Corner, React.CSSProperties> = {
  nw: { left: OFFSET, top: OFFSET, cursor: 'nwse-resize' },
  ne: { right: OFFSET, top: OFFSET, cursor: 'nesw-resize' },
  sw: { left: OFFSET, bottom: OFFSET, cursor: 'nesw-resize' },
  se: { right: OFFSET, bottom: OFFSET, cursor: 'nwse-resize' },
}

/**
 * The four corner handles of a selected card (DESIGN_SYSTEM §8): 9×9 squares in the canvas
 * color with a 1.5px white border, like the outline.
 */
export function ResizeHandles() {
  return CORNERS.map((corner) => (
    <div
      key={corner}
      data-handle={corner}
      data-testid={`resize-handle-${corner}`}
      className="absolute border-selection bg-background"
      style={{
        ...POSITION[corner],
        width: 'calc(9px * var(--inv-zoom, 1))',
        height: 'calc(9px * var(--inv-zoom, 1))',
        borderWidth: 'calc(1.5px * var(--inv-zoom, 1))',
        borderRadius: 'calc(3px * var(--inv-zoom, 1))',
      }}
    />
  ))
}
