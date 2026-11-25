import { describe, expect, it } from 'vitest'
import {
  boundsOf,
  clampZoom,
  dotGridSpacing,
  dotLayerPosition,
  fitViewport,
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  revealViewport,
  screenToWorld,
  stepZoom,
  visibleWorldRect,
  wheelDeltaPx,
  wheelZoomFactor,
  worldToScreen,
  zoomAt,
  zoomLabel,
  type Viewport,
} from '../../../../../src/renderer/views/canvas/Viewport'

const vp: Viewport = { x: 120, y: -40, zoom: 1.5 }

describe('screen and world conversion', () => {
  it('converts both ways', () => {
    expect(worldToScreen(vp, { x: 10, y: 20 })).toEqual({ x: 135, y: -10 })
    expect(screenToWorld(vp, { x: 135, y: -10 })).toEqual({ x: 10, y: 20 })
  })

  it('round-trips at any zoom', () => {
    for (const zoom of [0.1, 0.37, 1, 2.5, 4]) {
      const v = { x: -333.3, y: 77.7, zoom }
      const p = { x: 512.25, y: -1024.5 }
      const back = screenToWorld(v, worldToScreen(v, p))
      expect(back.x).toBeCloseTo(p.x, 9)
      expect(back.y).toBeCloseTo(p.y, 9)
    }
  })

  it('puts the world origin at the pan offset', () => {
    expect(worldToScreen(vp, { x: 0, y: 0 })).toEqual({ x: 120, y: -40 })
    expect(panBy(vp, 5, -5)).toEqual({ x: 125, y: -45, zoom: 1.5 })
  })
})

describe('zoomAt', () => {
  it('keeps the world point under the cursor fixed', () => {
    const cursor = { x: 640, y: 360 }
    const before = screenToWorld(vp, cursor)
    for (const zoom of [0.1, 0.5, 1, 3, 4]) {
      const after = screenToWorld(zoomAt(vp, cursor, zoom), cursor)
      expect(after.x).toBeCloseTo(before.x, 9)
      expect(after.y).toBeCloseTo(before.y, 9)
    }
  })

  it('clamps to 10%–400% and still keeps the point fixed', () => {
    const cursor = { x: 10, y: 10 }
    const before = screenToWorld(vp, cursor)
    const out = zoomAt(vp, cursor, 50)
    expect(out.zoom).toBe(MAX_ZOOM)
    expect(screenToWorld(out, cursor).x).toBeCloseTo(before.x, 9)
    expect(zoomAt(vp, cursor, 0.001).zoom).toBe(MIN_ZOOM)
    expect(clampZoom(1.2)).toBe(1.2)
  })
})

describe('stepZoom', () => {
  it('moves to the next stop', () => {
    expect(stepZoom(1, 1)).toBe(1.1)
    expect(stepZoom(1, -1)).toBe(0.9)
    expect(stepZoom(1.18, 1)).toBe(1.25)
    expect(stepZoom(1.18, -1)).toBe(1.1)
  })

  it('stops at the limits', () => {
    expect(stepZoom(4, 1)).toBe(4)
    expect(stepZoom(0.1, -1)).toBe(0.1)
  })
})

describe('wheel', () => {
  it('zooms in on an upward wheel and out on a downward one, capped per event', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1)
    expect(wheelZoomFactor(100)).toBeLessThan(1)
    expect(wheelZoomFactor(100)).toBe(wheelZoomFactor(25))
    expect(wheelZoomFactor(-2)).toBeCloseTo(1.016, 3)
  })

  it('converts line and page deltas to px', () => {
    expect(wheelDeltaPx(3, 0, 800)).toBe(3)
    expect(wheelDeltaPx(3, 1, 800)).toBe(48)
    expect(wheelDeltaPx(1, 2, 800)).toBe(800)
  })
})

describe('visibleWorldRect', () => {
  it('is the screen in world units, grown by the margin', () => {
    const size = { width: 1000, height: 500 }
    expect(visibleWorldRect({ x: -100, y: -50, zoom: 1 }, size)).toEqual({
      x: 100,
      y: 50,
      w: 1000,
      h: 500,
    })
    expect(visibleWorldRect({ x: 100, y: 50, zoom: 2 }, size, 200)).toEqual({
      x: -150,
      y: -125,
      w: 700,
      h: 450,
    })
  })
})

describe('zoom to fit', () => {
  it('bounds every rect', () => {
    expect(boundsOf([])).toBeNull()
    expect(
      boundsOf([
        { x: 0, y: 0, w: 10, h: 10 },
        { x: -20, y: 5, w: 5, h: 30 },
      ]),
    ).toEqual({ x: -20, y: 0, w: 30, h: 35 })
  })

  it('centers the bounds and never zooms in past 100%', () => {
    const size = { width: 1000, height: 800 }
    const small = fitViewport({ x: 0, y: 0, w: 100, h: 100 }, size)
    expect(small.zoom).toBe(1)
    expect(worldToScreen(small, { x: 50, y: 50 })).toEqual({ x: 500, y: 400 })

    const big = fitViewport({ x: -2500, y: -500, w: 5000, h: 1000 }, size, 64)
    expect(big.zoom).toBeCloseTo((1000 - 128) / 5000, 9)
    const center = worldToScreen(big, { x: 0, y: 0 })
    expect(center.x).toBeCloseTo(500, 9)
    expect(center.y).toBeCloseTo(400, 9)
  })

  it('stops at 10% for bounds too big to fit', () => {
    expect(fitViewport({ x: 0, y: 0, w: 1e6, h: 10 }, { width: 1000, height: 800 }).zoom).toBe(0.1)
  })

  it('goes back to the origin at 100% with nothing to fit', () => {
    expect(fitViewport(null, { width: 800, height: 600 })).toEqual({ x: 400, y: 300, zoom: 1 })
  })
})

describe('dot grid', () => {
  it('is 20px × zoom, doubled below 50%', () => {
    expect(dotGridSpacing(1)).toBe(20)
    expect(dotGridSpacing(2)).toBe(40)
    expect(dotGridSpacing(4)).toBe(80)
    expect(dotGridSpacing(0.5)).toBe(10)
    expect(dotGridSpacing(0.4)).toBe(16)
    expect(dotGridSpacing(0.25)).toBe(10)
  })

  it('is never hidden: further out it keeps doubling, at least 10px apart', () => {
    expect(dotGridSpacing(0.24)).toBeCloseTo(19.2)
    expect(dotGridSpacing(0.1)).toBeCloseTo(16)
    for (let zoom = 0.1; zoom < 0.5; zoom += 0.007) {
      expect(dotGridSpacing(zoom)).toBeGreaterThanOrEqual(10)
      expect(dotGridSpacing(zoom)).toBeLessThan(20)
    }
  })
})

it('labels the zoom as a whole percentage', () => {
  expect(zoomLabel(1)).toBe('100%')
  expect(zoomLabel(1.2545)).toBe('125%')
  expect(zoomLabel(0.1)).toBe('10%')
})

describe('revealViewport', () => {
  const size = { width: 1000, height: 800 }
  const card = { x: 100, y: 100, w: 220, h: 64 }

  it('leaves a readable, visible card alone, and never moves before the canvas is measured', () => {
    const vp = { x: 0, y: 0, zoom: 1 }
    expect(revealViewport(vp, card, size)).toBe(vp)
    const zoomedOut = { x: 0, y: 0, zoom: 0.5 }
    expect(revealViewport(zoomedOut, card, { width: 0, height: 0 })).toBe(zoomedOut)
  })

  it('zooms in to 100% around the card when zoomed out, keeping it where the eye is', () => {
    const vp = { x: 300, y: 200, zoom: 0.5 }
    const next = revealViewport(vp, card, size)
    expect(next.zoom).toBe(1)
    const before = worldToScreen(vp, { x: 210, y: 132 })
    const after = worldToScreen(next, { x: 210, y: 132 })
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('pans just enough to bring an off-screen card 48px inside the edge', () => {
    expect(
      revealViewport({ x: 0, y: 0, zoom: 1 }, { x: 900, y: -50, w: 220, h: 64 }, size),
    ).toEqual({
      x: 1000 - 48 - 1120,
      y: 98,
      zoom: 1,
    })
  })
})

describe('dot position', () => {
  it('puts a dot on the world origin, so doubling the spacing keeps every other dot in place', () => {
    for (const [origin, s] of [
      [0, 20],
      [37.5, 20],
      [-113, 16.4],
    ] as const) {
      const dotsAt = (tile: number) =>
        Array.from({ length: 40 }, (_, i) => dotLayerPosition(origin, tile) + tile / 2 + i * tile)
      expect(dotsAt(s)[0]).toBeCloseTo(origin)
      // The first 20 doubled dots fall within the 40 fine ones.
      for (const d of dotsAt(s * 2).slice(0, 20)) {
        expect(dotsAt(s).some((f) => Math.abs(f - d) < 1e-6)).toBe(true)
      }
    }
  })
})
