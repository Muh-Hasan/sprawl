import type { CanvasItem, CanvasRect } from '@shared/types'

/**
 * Rendered card heights. A note card's stored `h` is a floor: the card grows with its content up
 * to the max (UI_SPEC §4.5). Hit tests, resizes and the selection box use the real height, which
 * one shared ResizeObserver keeps here (in world px: layout size ignores the zoom transform).
 */
const heights = new Map<string, number>()
const listeners = new Set<() => void>()
let version = 0

let observer: ResizeObserver | null = null
function getObserver(): ResizeObserver {
  observer ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).dataset.cardId
      const h = entry.borderBoxSize[0]?.blockSize
      if (id && h !== undefined) heights.set(id, h)
    }
    version++
    for (const fn of listeners) fn()
  })
  return observer
}

/** Measures a card element (it carries `data-card-id`) until the returned cleanup runs. */
export function observeCard(el: HTMLElement): () => void {
  const ro = getObserver()
  ro.observe(el)
  return () => {
    ro.unobserve(el)
    const id = el.dataset.cardId
    if (id) heights.delete(id)
  }
}

/** The card's rect as rendered: its stored rect, but at least as tall as it measured. */
export function renderedRect(item: CanvasItem, rect: CanvasRect = item): CanvasRect {
  const measured = heights.get(item.id)
  return measured === undefined ? rect : { ...rect, h: Math.max(rect.h, measured) }
}

/** For `useSyncExternalStore`: re-render when a card's measured height changes. */
export function subscribeHeights(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function heightsVersion(): number {
  return version
}
