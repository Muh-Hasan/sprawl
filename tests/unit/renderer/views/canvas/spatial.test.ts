import { describe, expect, it } from 'vitest'
import { intersects, SpatialGrid } from '../../../../../src/renderer/views/canvas/spatial'
import type { Rect } from '../../../../../src/renderer/views/canvas/Viewport'

const sorted = (ids: Set<string>) => [...ids].sort()

/** The brute-force answer the grid must agree with. */
function bruteForce(rects: Map<string, Rect>, view: Rect): string[] {
  return [...rects]
    .filter(([, r]) => intersects(r, view))
    .map(([id]) => id)
    .sort()
}

describe('SpatialGrid', () => {
  it('returns only the cards that intersect the view', () => {
    const grid = new SpatialGrid()
    grid.set('a', { x: 0, y: 0, w: 220, h: 100 })
    grid.set('b', { x: 600, y: 0, w: 220, h: 100 })
    grid.set('c', { x: -900, y: -900, w: 220, h: 100 })
    expect(sorted(grid.query({ x: 0, y: 0, w: 500, h: 500 }))).toEqual(['a'])
    expect(sorted(grid.query({ x: 100, y: 50, w: 600, h: 10 }))).toEqual(['a', 'b'])
    expect(sorted(grid.query({ x: -1000, y: -1000, w: 3000, h: 3000 }))).toEqual(['a', 'b', 'c'])
    expect(sorted(grid.query({ x: 5000, y: 5000, w: 100, h: 100 }))).toEqual([])
  })

  it('finds a card that spans several cells once, from any of them', () => {
    const grid = new SpatialGrid(512)
    grid.set('wide', { x: -100, y: -100, w: 2000, h: 1200 })
    expect(sorted(grid.query({ x: 1800, y: 1000, w: 10, h: 10 }))).toEqual(['wide'])
    expect(sorted(grid.query({ x: -100, y: -100, w: 5000, h: 5000 }))).toEqual(['wide'])
  })

  it('follows moves and deletes', () => {
    const grid = new SpatialGrid()
    grid.set('a', { x: 0, y: 0, w: 100, h: 100 })
    grid.set('a', { x: 3000, y: 3000, w: 100, h: 100 })
    expect(sorted(grid.query({ x: 0, y: 0, w: 200, h: 200 }))).toEqual([])
    expect(sorted(grid.query({ x: 2900, y: 2900, w: 200, h: 200 }))).toEqual(['a'])
    grid.delete('a')
    expect(grid.size).toBe(0)
    expect(sorted(grid.query({ x: 2900, y: 2900, w: 200, h: 200 }))).toEqual([])
  })

  it('agrees with a brute-force scan over 1,000 random cards', () => {
    let seed = 42
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const grid = new SpatialGrid()
    const rects = new Map<string, Rect>()
    for (let i = 0; i < 1000; i++) {
      const r = {
        x: rand() * 20000 - 10000,
        y: rand() * 20000 - 10000,
        w: 160 + rand() * 320,
        h: 64 + rand() * 256,
      }
      rects.set(`c${i}`, r)
      grid.set(`c${i}`, r)
    }
    for (let i = 0; i < 50; i++) {
      const view = {
        x: rand() * 20000 - 10000,
        y: rand() * 20000 - 10000,
        w: rand() * 6000,
        h: rand() * 4000,
      }
      expect(sorted(grid.query(view))).toEqual(bruteForce(rects, view))
    }
  })
})
