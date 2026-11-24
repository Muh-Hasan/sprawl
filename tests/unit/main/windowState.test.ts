import { describe, expect, it } from 'vitest'
import { initialBounds, type Rect } from '../../../src/main/windowState'

const primary: Rect = { x: 0, y: 0, width: 1920, height: 1040 }
const right: Rect = { x: 1920, y: 0, width: 2560, height: 1400 }

describe('initialBounds', () => {
  it('uses the default size with no saved state', () => {
    expect(initialBounds(null, [primary])).toEqual({ width: 1440, height: 900, maximized: false })
  })

  it('restores a position that is still on screen', () => {
    const saved = { x: 2100, y: 100, width: 1200, height: 800, maximized: true }
    expect(initialBounds(saved, [primary, right])).toEqual(saved)
  })

  it('drops the position when its monitor is gone, keeping the size', () => {
    const saved = { x: 2100, y: 100, width: 1200, height: 800, maximized: false }
    expect(initialBounds(saved, [primary])).toEqual({ width: 1200, height: 800, maximized: false })
  })

  it('drops a position whose title bar is above the screen', () => {
    const saved = { x: 100, y: -500, width: 1200, height: 800, maximized: false }
    expect(initialBounds(saved, [primary]).x).toBeUndefined()
  })

  it('never goes below the minimum size', () => {
    const saved = { x: 0, y: 0, width: 300, height: 200, maximized: false }
    expect(initialBounds(saved, [primary])).toMatchObject({ width: 960, height: 600 })
  })
})
