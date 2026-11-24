import type { Rect } from './Viewport'

/** The bucket size for spatial culling (ARCHITECTURE §6). */
export const CELL_SIZE = 512

/**
 * A uniform bucket grid over world space, so culling only looks at the cards near the
 * viewport instead of every card. Each card is filed in every cell its bounds touch.
 */
export class SpatialGrid {
  private readonly cells = new Map<string, Set<string>>()
  private readonly itemCells = new Map<string, string[]>()
  private readonly rects = new Map<string, Rect>()

  constructor(private readonly cellSize = CELL_SIZE) {}

  get size(): number {
    return this.rects.size
  }

  /** Adds or moves a card. */
  set(id: string, rect: Rect): void {
    this.delete(id)
    const keys = this.cellKeys(rect)
    for (const key of keys) {
      let cell = this.cells.get(key)
      if (!cell) this.cells.set(key, (cell = new Set()))
      cell.add(id)
    }
    this.itemCells.set(id, keys)
    this.rects.set(id, { x: rect.x, y: rect.y, w: rect.w, h: rect.h })
  }

  delete(id: string): void {
    const keys = this.itemCells.get(id)
    if (!keys) return
    for (const key of keys) {
      const cell = this.cells.get(key)
      cell?.delete(id)
      if (cell?.size === 0) this.cells.delete(key)
    }
    this.itemCells.delete(id)
    this.rects.delete(id)
  }

  clear(): void {
    this.cells.clear()
    this.itemCells.clear()
    this.rects.clear()
  }

  /** The ids of the cards whose bounds intersect `rect` (edges touching count). */
  query(rect: Rect): Set<string> {
    const out = new Set<string>()
    for (const key of this.cellKeys(rect)) {
      const cell = this.cells.get(key)
      if (!cell) continue
      for (const id of cell) {
        if (out.has(id)) continue
        const r = this.rects.get(id)
        if (r && intersects(r, rect)) out.add(id)
      }
    }
    return out
  }

  private cellKeys(rect: Rect): string[] {
    const s = this.cellSize
    const x0 = Math.floor(rect.x / s)
    const y0 = Math.floor(rect.y / s)
    const x1 = Math.floor((rect.x + rect.w) / s)
    const y1 = Math.floor((rect.y + rect.h) / s)
    const keys: string[] = []
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) keys.push(`${cx},${cy}`)
    }
    return keys
  }
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h
}
