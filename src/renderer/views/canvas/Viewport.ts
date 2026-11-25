/**
 * Pan and zoom math (ARCHITECTURE §6). A viewport maps world to screen as
 * `screen = world × zoom + (x, y)`: `x, y` is where the world origin sits on screen, in px
 * relative to the canvas element's top-left corner.
 */

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Size {
  width: number
  height: number
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

/** Below this zoom, cards render as simplified title-only blocks (UI_SPEC §4.5). */
export const SIMPLIFIED_BELOW = 0.4

/** The stops Ctrl+= / Ctrl+- and the zoom pill step through. */
export const ZOOM_STOPS = [
  0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4,
] as const

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function screenToWorld(vp: Viewport, p: Point): Point {
  return { x: (p.x - vp.x) / vp.zoom, y: (p.y - vp.y) / vp.zoom }
}

export function worldToScreen(vp: Viewport, p: Point): Point {
  return { x: p.x * vp.zoom + vp.x, y: p.y * vp.zoom + vp.y }
}

export function panBy(vp: Viewport, dx: number, dy: number): Viewport {
  return { x: vp.x + dx, y: vp.y + dy, zoom: vp.zoom }
}

/** Zooms to `zoom` (clamped) keeping the world point under `anchor` (screen px) fixed. */
export function zoomAt(vp: Viewport, anchor: Point, zoom: number): Viewport {
  const next = clampZoom(zoom)
  const world = screenToWorld(vp, anchor)
  return { x: anchor.x - world.x * next, y: anchor.y - world.y * next, zoom: next }
}

/** The next zoom stop above (`dir = 1`) or below (`dir = -1`) the current zoom. */
export function stepZoom(zoom: number, dir: 1 | -1): number {
  const eps = 1e-3
  if (dir === 1) return ZOOM_STOPS.find((s) => s > zoom + eps) ?? MAX_ZOOM
  return [...ZOOM_STOPS].reverse().find((s) => s < zoom - eps) ?? MIN_ZOOM
}

/**
 * The zoom factor for one ctrl+wheel event. A touchpad pinch sends many small deltas, a mouse
 * wheel one big one per notch, so the delta is capped: one notch zooms by about 22%.
 */
export function wheelZoomFactor(deltaY: number): number {
  const capped = Math.max(-25, Math.min(25, deltaY))
  return Math.exp(-capped * 0.008)
}

/** `WheelEvent.deltaMode` lines and pages, in px. */
export function wheelDeltaPx(delta: number, deltaMode: number, pageSize: number): number {
  if (deltaMode === 1) return delta * 16
  if (deltaMode === 2) return delta * pageSize
  return delta
}

/** The world rect visible on a screen of `size`, grown by `marginPx` screen px on every side. */
export function visibleWorldRect(vp: Viewport, size: Size, marginPx = 0): Rect {
  const topLeft = screenToWorld(vp, { x: -marginPx, y: -marginPx })
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: (size.width + marginPx * 2) / vp.zoom,
    h: (size.height + marginPx * 2) / vp.zoom,
  }
}

/** The bounding box of `rects`, or null if there are none. */
export function boundsOf(rects: Iterable<Rect>): Rect | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.w)
    maxY = Math.max(maxY, r.y + r.h)
  }
  return minX === Infinity ? null : { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/**
 * The viewport that fits `bounds` in `size` with `padding` px around it, never zooming in past
 * 100%. With nothing to fit, it goes back to the origin at 100%.
 */
export function fitViewport(bounds: Rect | null, size: Size, padding = 64): Viewport {
  if (!bounds) return { x: size.width / 2, y: size.height / 2, zoom: 1 }
  const availW = Math.max(1, size.width - padding * 2)
  const availH = Math.max(1, size.height - padding * 2)
  const zoom = clampZoom(Math.min(1, availW / bounds.w, availH / bounds.h))
  return {
    x: size.width / 2 - (bounds.x + bounds.w / 2) * zoom,
    y: size.height / 2 - (bounds.y + bounds.h / 2) * zoom,
    zoom,
  }
}

/**
 * The dot grid's spacing in screen px (UI_SPEC §4.1): 20px × zoom, doubled below 50%, and
 * doubled again each time the zoom halves after that, so it's never hidden and the dots stay at
 * least 10px apart however far out you zoom.
 */
export function dotGridSpacing(zoom: number): number {
  let world = 20
  while (world * zoom < 10) world *= 2
  return world * zoom
}

/**
 * The `background-position` (px) that puts the dots on the world grid. A
 * `radial-gradient(circle …)` tile draws its dot in the tile's center, so the tile starts half a
 * tile before the origin. On the world grid, when the spacing doubles every other dot stays put
 * instead of the whole grid jumping by half a step.
 */
export function dotLayerPosition(origin: number, tile: number): number {
  return origin - tile / 2
}

/** Linear interpolation between two viewports, for the 240ms "zoom to fit". */
export function lerpViewport(a: Viewport, b: Viewport, t: number): Viewport {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    zoom: a.zoom + (b.zoom - a.zoom) * t,
  }
}

/** The zoom shown in the pill, e.g. 1.254 → "125%". */
export function zoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`
}

/**
 * The viewport that shows `rect` (world) comfortably: zoomed in to at least `minZoom` around the
 * rect's center (so it stays where the eye is), then panned just enough to keep it `margin` px
 * inside the screen. Returns `vp` itself when nothing needs to change.
 */
export function revealViewport(
  vp: Viewport,
  rect: Rect,
  size: Size,
  { minZoom = 1, margin = 48 }: { minZoom?: number; margin?: number } = {},
): Viewport {
  if (size.width <= 0 || size.height <= 0) return vp // not measured yet
  let next = vp
  if (vp.zoom < minZoom) {
    const center = worldToScreen(vp, { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 })
    next = zoomAt(vp, center, minZoom)
  }
  const fit = (start: number, length: number, screen: number): number => {
    if (length + margin * 2 > screen) return screen / 2 - (start + length / 2)
    if (start < margin) return margin - start
    if (start + length > screen - margin) return screen - margin - (start + length)
    return 0
  }
  const topLeft = worldToScreen(next, rect)
  const dx = fit(topLeft.x, rect.w * next.zoom, size.width)
  const dy = fit(topLeft.y, rect.h * next.zoom, size.height)
  return dx === 0 && dy === 0 ? next : panBy(next, dx, dy)
}
