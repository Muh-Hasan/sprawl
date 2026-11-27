/**
 * App text size (PRODUCT §4, DESIGN_SYSTEM §3): four steps, each an Electron zoom factor, so the
 * whole UI scales in every window. Plain Ctrl+= / Ctrl+- stay as canvas zoom.
 */
export const TEXT_SIZES = ['small', 'default', 'large', 'larger'] as const
export type TextSize = (typeof TEXT_SIZES)[number]

export const DEFAULT_TEXT_SIZE: TextSize = 'default'

export const TEXT_SIZE_ZOOM: Record<TextSize, number> = {
  small: 0.9,
  default: 1,
  large: 1.1,
  larger: 1.25,
}

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  small: 'Small',
  default: 'Default',
  large: 'Large',
  larger: 'Larger',
}

/** One step bigger (+1) or smaller (-1), stopping at either end. */
export function stepTextSize(size: TextSize, direction: 1 | -1): TextSize {
  const index = TEXT_SIZES.indexOf(size) + direction
  return TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, Math.max(0, index))] ?? size
}

/** A length in CSS px, as device-independent px at `size`'s zoom factor. */
export function toWindowPx(css: number, size: TextSize): number {
  return Math.round(css * TEXT_SIZE_ZOOM[size])
}
