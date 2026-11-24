import { describe, expect, it } from 'vitest'
import {
  CANVAS_SHORTCUTS,
  matchesShortcut,
  NAV_SHORTCUTS,
  shortcutLabel,
} from '../../../../src/renderer/lib/shortcuts'

const key = (
  code: string,
  mods: Partial<Record<'ctrl' | 'shift' | 'alt' | 'meta', boolean>> = {},
) => ({
  code,
  ctrlKey: mods.ctrl ?? false,
  shiftKey: mods.shift ?? false,
  altKey: mods.alt ?? false,
  metaKey: mods.meta ?? false,
})

describe('matchesShortcut', () => {
  it('matches the physical key with exactly the given modifiers', () => {
    expect(matchesShortcut(key('Digit1', { ctrl: true }), NAV_SHORTCUTS.canvas)).toBe(true)
    expect(matchesShortcut(key('Numpad4', { ctrl: true }), NAV_SHORTCUTS.drawings)).toBe(true)
  })

  it('rejects missing or extra modifiers and other keys', () => {
    expect(matchesShortcut(key('Digit1'), NAV_SHORTCUTS.canvas)).toBe(false)
    expect(matchesShortcut(key('Digit1', { ctrl: true, shift: true }), NAV_SHORTCUTS.canvas)).toBe(
      false,
    )
    expect(matchesShortcut(key('Digit1', { ctrl: true, alt: true }), NAV_SHORTCUTS.canvas)).toBe(
      false,
    )
    expect(matchesShortcut(key('Digit1', { ctrl: true, meta: true }), NAV_SHORTCUTS.canvas)).toBe(
      false,
    )
    expect(matchesShortcut(key('Digit2', { ctrl: true }), NAV_SHORTCUTS.canvas)).toBe(false)
  })

  it('matches Shift+1 by code even though it types "!"', () => {
    expect(
      matchesShortcut(key('Digit1', { shift: true }), { codes: ['Digit1'], shift: true }),
    ).toBe(true)
  })
})

describe('shortcutLabel', () => {
  it('formats tooltips as Ctrl+1', () => {
    expect(shortcutLabel(NAV_SHORTCUTS.log)).toBe('Ctrl+3')
    expect(shortcutLabel({ codes: ['KeyD'], ctrl: true, shift: true })).toBe('Ctrl+Shift+D')
  })
})

describe('canvas shortcuts', () => {
  it('zooms with Ctrl+= / Ctrl+- / Ctrl+0, numpad keys included', () => {
    expect(matchesShortcut(key('Equal', { ctrl: true }), CANVAS_SHORTCUTS.zoomIn)).toBe(true)
    expect(matchesShortcut(key('NumpadAdd', { ctrl: true }), CANVAS_SHORTCUTS.zoomIn)).toBe(true)
    expect(matchesShortcut(key('Minus', { ctrl: true }), CANVAS_SHORTCUTS.zoomOut)).toBe(true)
    expect(matchesShortcut(key('NumpadSubtract', { ctrl: true }), CANVAS_SHORTCUTS.zoomOut)).toBe(
      true,
    )
    expect(matchesShortcut(key('Digit0', { ctrl: true }), CANVAS_SHORTCUTS.zoomReset)).toBe(true)
    expect(matchesShortcut(key('Equal'), CANVAS_SHORTCUTS.zoomIn)).toBe(false)
  })

  it('fits with Shift+1 and picks tools with bare V and H', () => {
    expect(matchesShortcut(key('Digit1', { shift: true }), CANVAS_SHORTCUTS.zoomFit)).toBe(true)
    expect(matchesShortcut(key('KeyV'), CANVAS_SHORTCUTS.toolSelect)).toBe(true)
    expect(matchesShortcut(key('KeyH'), CANVAS_SHORTCUTS.toolHand)).toBe(true)
    expect(matchesShortcut(key('KeyV', { ctrl: true }), CANVAS_SHORTCUTS.toolSelect)).toBe(false)
  })

  it('labels them for tooltips', () => {
    expect(shortcutLabel(CANVAS_SHORTCUTS.zoomIn)).toBe('Ctrl+=')
    expect(shortcutLabel(CANVAS_SHORTCUTS.zoomOut)).toBe('Ctrl+-')
    expect(shortcutLabel(CANVAS_SHORTCUTS.zoomReset)).toBe('Ctrl+0')
    expect(shortcutLabel(CANVAS_SHORTCUTS.toolHand)).toBe('H')
  })
})
