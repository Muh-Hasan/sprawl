import { describe, expect, it } from 'vitest'
import { NOTE_COLORS } from '@shared/constants'
import { NOTE_SIZE } from '@/views/canvas/ops'
import { WELCOME_NOTES } from '@/views/canvas/welcomeBoard'

/** Room each sample card needs, as it grows to fit a two-line body. */
const CARD_H = 112

describe('the welcome board', () => {
  it('has five notes in five different colors, none of them stone', () => {
    expect(WELCOME_NOTES).toHaveLength(5)
    const colors = new Set(WELCOME_NOTES.map((n) => n.color))
    expect(colors.size).toBe(5)
    for (const color of colors) expect(NOTE_COLORS).toContain(color)
    expect(colors).not.toContain('stone')
  })

  it('lays its cards out without overlap', () => {
    const rects = WELCOME_NOTES.map((n) => ({ x: n.dx, y: n.dy, w: NOTE_SIZE.w, h: CARD_H }))
    for (const [i, a] of rects.entries()) {
      for (const b of rects.slice(i + 1)) {
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
        expect(apart).toBe(true)
      }
    }
  })

  it('gives every note a title and a one-line lesson', () => {
    for (const n of WELCOME_NOTES) {
      expect(n.title.trim()).not.toBe('')
      expect(n.body.trim()).not.toBe('')
      expect(n.body).not.toContain('\n')
    }
  })
})
