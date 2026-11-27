import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../../../../src/renderer/stores/uiStore'

const ui = () => useUiStore.getState()

describe('uiStore focus request', () => {
  beforeEach(() => ui().closeNote())

  it('is taken once, by the note and the place it names', () => {
    ui().openNote('a', { focus: 'body' })
    expect(ui().takeFocusRequest('a', 'title')).toBe(false)
    // The editor of the note that was open before doesn't take it.
    expect(ui().takeFocusRequest('b', 'body')).toBe(false)
    expect(ui().takeFocusRequest('a', 'body')).toBe(true)
    expect(ui().takeFocusRequest('a', 'body')).toBe(false)
  })

  it('opening a note without one drops a request that was never taken', () => {
    ui().openNote('a', { focus: 'title' })
    ui().openNote('b')
    expect(ui().focusRequest).toBeNull()
    expect(ui().takeFocusRequest('a', 'title')).toBe(false)
  })
})
