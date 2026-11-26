import { describe, expect, it } from 'vitest'
import {
  acceleratorFromEvent,
  acceleratorKeys,
  isValidAccelerator,
  keyOfCode,
} from '../../../src/shared/accelerator'

const press = (
  code: string,
  mods: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } = {},
) => ({
  code,
  ctrlKey: mods.ctrl ?? false,
  altKey: mods.alt ?? false,
  shiftKey: mods.shift ?? false,
  metaKey: mods.meta ?? false,
})

describe('isValidAccelerator', () => {
  it('accepts modifiers in order plus one key', () => {
    for (const a of [
      'Ctrl+Shift+Space',
      'Alt+N',
      'Ctrl+Alt+Shift+F12',
      'Super+K',
      'Ctrl+\\',
      'Ctrl+=',
    ]) {
      expect(isValidAccelerator(a), a).toBe(true)
    }
  })

  it('needs Ctrl, Alt or Super: Shift alone would swallow typing', () => {
    expect(isValidAccelerator('Shift+A')).toBe(false)
    expect(isValidAccelerator('Space')).toBe(false)
    expect(isValidAccelerator('A')).toBe(false)
  })

  it('rejects unknown parts, repeats, wrong order and a missing key', () => {
    for (const a of [
      '',
      'Ctrl+',
      'Ctrl+Ctrl+A',
      'Shift+Ctrl+A',
      'Hyper+A',
      'Ctrl+Foo',
      'Ctrl+F25',
      'Ctrl+a',
    ]) {
      expect(isValidAccelerator(a), a).toBe(false)
    }
  })
})

describe('acceleratorFromEvent', () => {
  it('builds the accelerator from the physical key', () => {
    expect(acceleratorFromEvent(press('Space', { ctrl: true, shift: true }))).toBe(
      'Ctrl+Shift+Space',
    )
    expect(acceleratorFromEvent(press('KeyK', { alt: true }))).toBe('Alt+K')
    expect(acceleratorFromEvent(press('Digit1', { ctrl: true, shift: true }))).toBe('Ctrl+Shift+1')
    expect(acceleratorFromEvent(press('Numpad7', { ctrl: true }))).toBe('Ctrl+7')
    expect(acceleratorFromEvent(press('F9', { meta: true }))).toBe('Super+F9')
    expect(acceleratorFromEvent(press('ArrowUp', { ctrl: true, alt: true }))).toBe('Ctrl+Alt+Up')
  })

  it('gives null while only modifiers are down, or for a key it cannot use', () => {
    expect(acceleratorFromEvent(press('ControlLeft', { ctrl: true }))).toBeNull()
    expect(acceleratorFromEvent(press('ShiftRight', { shift: true }))).toBeNull()
    expect(acceleratorFromEvent(press('IntlBackslash', { ctrl: true }))).toBeNull()
  })

  it('round-trips through the validator', () => {
    const accel = acceleratorFromEvent(press('Period', { ctrl: true, alt: true }))!
    expect(accel).toBe('Ctrl+Alt+.')
    expect(isValidAccelerator(accel)).toBe(true)
  })
})

describe('keys', () => {
  it('maps codes and shows Super as Win', () => {
    expect(keyOfCode('KeyZ')).toBe('Z')
    expect(keyOfCode('Backquote')).toBe('`')
    expect(keyOfCode('MetaLeft')).toBeNull()
    expect(acceleratorKeys('Ctrl+Super+Space')).toEqual(['Ctrl', 'Win', 'Space'])
  })
})
