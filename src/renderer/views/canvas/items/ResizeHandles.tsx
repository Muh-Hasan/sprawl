import { CORNERS, type Corner } from '../ops'

/**
 * Where each handle sits: centered on the selection outline's corner, which is 2px outside the
 * card plus half the 1.5px outline. Sizes are in screen px, so they're divided by the zoom
 * (`--inv-zoom`, set on the world layer).
 */
const OFFSET = 'calc(-6.75px * var(--inv-zoom, 1))'
const POSITION: Record<Corner, React.CSSProperties> = {
  nw: { left: OFFSET, top: OFFSET, cursor: 'nwse-resize' },
  ne: { right: OFFSET, top: OFFSET, cursor: 'nesw-resize' },
  sw: { left: OFFSET, bottom: OFFSET, cursor: 'nesw-resize' },
  se: { right: OFFSET, bottom: OFFSET, cursor: 'nwse-resize' },
}

/** The four corner handles of a selected card (DESIGN_SYSTEM §8): 8×8 white squares. */
export function ResizeHandles() {
  return CORNERS.map((corner) => (
    <div
      key={corner}
      data-handle={corner}
      data-testid={`resize-handle-${corner}`}
      className="absolute border-background bg-selection"
      style={{
        ...POSITION[corner],
        width: 'calc(8px * var(--inv-zoom, 1))',
        height: 'calc(8px * var(--inv-zoom, 1))',
        borderWidth: 'calc(1px * var(--inv-zoom, 1))',
        borderRadius: 'calc(2px * var(--inv-zoom, 1))',
      }}
    />
  ))
}
