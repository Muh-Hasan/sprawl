import { describe, expect, it } from 'vitest'
import { CASCADE, cascadeSpot } from '../../../src/shared/placement'

describe('cascadeSpot', () => {
  it('keeps the start when nothing is there', () => {
    expect(cascadeSpot({ x: 80, y: 40 }, [{ x: 400, y: 400 }])).toEqual({ x: 80, y: 40 })
  })

  it('steps 40px down and right past each card on the diagonal', () => {
    const taken = [
      { x: 80, y: 40 },
      { x: 120, y: 80 },
    ]
    expect(cascadeSpot({ x: 80, y: 40 }, taken)).toEqual({ x: 160, y: 120 })
  })

  it('counts a card within 20px on both axes as on the spot', () => {
    expect(cascadeSpot({ x: 0, y: 0 }, [{ x: 16, y: -8 }])).toEqual({ x: 40, y: 40 })
    // 24px off on one axis is clear: the card under it shows.
    expect(cascadeSpot({ x: 0, y: 0 }, [{ x: 24, y: 0 }])).toEqual({ x: 0, y: 0 })
  })

  it('settles for the last step when the whole diagonal is taken', () => {
    const taken = Array.from({ length: CASCADE.tries + 4 }, (_, i) => ({ x: i * 40, y: i * 40 }))
    const last = (CASCADE.tries - 1) * CASCADE.step
    expect(cascadeSpot({ x: 0, y: 0 }, taken)).toEqual({ x: last, y: last })
  })
})
