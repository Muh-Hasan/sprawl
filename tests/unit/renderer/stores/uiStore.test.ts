import { beforeEach, describe, expect, it } from 'vitest'
import { panelCover, useUiStore } from '../../../../src/renderer/stores/uiStore'

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

describe('panelCover', () => {
  beforeEach(() => {
    ui().closeNote()
    ui().setPanelWidth(440)
  })

  it('is the side panel width plus its 12px gap while a note is open', () => {
    expect(panelCover(1200)).toBe(0)
    ui().openNote('a')
    expect(panelCover(1200)).toBe(452)
  })

  it('is 0 on the full page, and never more than a narrow view leaves', () => {
    ui().openNote('a')
    expect(panelCover(400)).toBe(400 - 24 + 12)
    ui().setPanelMode('full')
    expect(panelCover(1200)).toBe(0)
  })
})
