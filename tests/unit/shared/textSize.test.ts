import { describe, expect, it } from 'vitest'
import { parseSetting } from '../../../src/shared/schemas'
import { stepTextSize, TEXT_SIZE_ZOOM, TEXT_SIZES, toWindowPx } from '../../../src/shared/textSize'

describe('text size', () => {
  it('has four steps from 0.9 to 1.25, default in the middle', () => {
    expect(TEXT_SIZES.map((s) => TEXT_SIZE_ZOOM[s])).toEqual([0.9, 1, 1.1, 1.25])
    expect(parseSetting('textSize', undefined)).toBe('default')
  })

  it('steps one size up or down', () => {
    expect(stepTextSize('default', 1)).toBe('large')
    expect(stepTextSize('large', 1)).toBe('larger')
    expect(stepTextSize('default', -1)).toBe('small')
    expect(stepTextSize('larger', -1)).toBe('large')
  })

  it('stops at either end', () => {
    expect(stepTextSize('larger', 1)).toBe('larger')
    expect(stepTextSize('small', -1)).toBe('small')
  })

  it('turns CSS px into window px at the zoom factor', () => {
    expect(toWindowPx(44, 'default')).toBe(44)
    expect(toWindowPx(44, 'larger')).toBe(55)
    expect(toWindowPx(520, 'small')).toBe(468)
    expect(toWindowPx(44, 'large')).toBe(48)
  })

  it("rejects a size that isn't one of the four", () => {
    expect(parseSetting('textSize', 'huge')).toBe('default')
    expect(parseSetting('textSize', 1.1)).toBe('default')
  })
})
