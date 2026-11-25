import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem, CanvasOp, Note, NotePatch } from '../../../../src/shared/types'
import { cardNote } from '../../helpers/cardNote'

const get = vi.fn<(id: string) => Promise<Note>>()
const update = vi.fn<(id: string, patch: NotePatch) => Promise<Note>>()
const apply = vi.fn<(ops: CanvasOp[]) => Promise<{ created: [] }>>()
const linksAdd = vi.fn()

vi.stubGlobal('window', {
  sprawl: {
    notes: { get, update, links: { add: linksAdd } },
    canvas: { apply },
    settings: { set: vi.fn() },
  },
})

const { useNoteStore } = await import('../../../../src/renderer/stores/noteStore')
const { useCanvasStore } = await import('../../../../src/renderer/stores/canvasStore')
const { flushAll } = await import('../../../../src/renderer/lib/flushes')

const stored: Note = {
  id: 'n1',
  title: 'Plan',
  bodyJson: '[]',
  bodyText: '',
  color: 'stone',
  dueDay: null,
  dueTime: null,
  remind: 'none',
  remindAt: null,
  remindedAt: null,
  doneAt: null,
  checkTotal: 0,
  checkDone: 0,
  attachCount: 0,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
  links: [],
}

const card: CanvasItem = {
  id: 'c1',
  kind: 'note',
  refId: 'n1',
  url: null,
  title: null,
  x: 0,
  y: 0,
  w: 220,
  h: 64,
  z: 1,
  createdAt: 1,
  updatedAt: 1,
  note: cardNote({ title: 'Plan' }),
}

const cardNoteNow = () => useCanvasStore.getState().items.get('c1')?.note
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

beforeEach(async () => {
  vi.useFakeTimers()
  get.mockReset().mockResolvedValue(stored)
  update.mockReset().mockImplementation(async (_id, patch) => {
    const bodyText = patch.bodyJson ? 'derived text' : ''
    return { ...stored, ...patch, bodyText, checkTotal: patch.bodyJson ? 2 : 0, checkDone: 1 }
  })
  apply.mockReset().mockResolvedValue({ created: [] })
  useCanvasStore.setState({ ready: true, items: new Map([['c1', card]]) })
  await useNoteStore.getState().open('n1')
})
afterEach(() => {
  useNoteStore.getState().close()
  vi.useRealTimers()
})

describe('note store autosave', () => {
  it('waits 500ms after the last change, then saves once with everything', async () => {
    const notes = useNoteStore.getState()
    notes.edit({ title: 'P' })
    vi.advanceTimersByTime(300)
    notes.edit({ title: 'Pl' })
    notes.bodyChanged(() => '[{"type":"paragraph"}]')
    vi.advanceTimersByTime(499)
    expect(update).not.toHaveBeenCalled()
    expect(useNoteStore.getState().status).toBe('saving')
    vi.advanceTimersByTime(1)
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith('n1', {
      title: 'Pl',
      bodyJson: '[{"type":"paragraph"}]',
    })
    await settle()
    expect(useNoteStore.getState().status).toBe('saved')
  })

  it('serializes the body only when the save runs', () => {
    const serialize = vi.fn(() => '[1]')
    for (let i = 0; i < 20; i++) useNoteStore.getState().bodyChanged(serialize)
    expect(serialize).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(serialize).toHaveBeenCalledTimes(1)
  })

  it('flushes at once on demand (blur, close, quit)', () => {
    useNoteStore.getState().edit({ title: 'Now' })
    flushAll()
    expect(update).toHaveBeenCalledWith('n1', { title: 'Now' })
  })

  it('saves on close', () => {
    useNoteStore.getState().edit({ title: 'Bye' })
    useNoteStore.getState().close()
    expect(update).toHaveBeenCalledWith('n1', { title: 'Bye' })
  })

  it("doesn't write a body that didn't change", async () => {
    useNoteStore.getState().bodyChanged(() => '[]')
    vi.advanceTimersByTime(500)
    expect(update).not.toHaveBeenCalled()
    await settle()
    expect(useNoteStore.getState().status).toBe('saved')
  })

  it('saves due changes at once, and shows the derived reminder before main answers', () => {
    useNoteStore.getState().edit({ dueDay: '2026-11-28', dueTime: '15:00', remind: 'at' })
    expect(update).toHaveBeenCalledTimes(1)
    expect(useNoteStore.getState().note?.remindAt).toBe(new Date(2026, 10, 28, 15).getTime())
    useNoteStore.getState().edit({ dueTime: null })
    expect(useNoteStore.getState().note).toMatchObject({ remind: 'none', remindAt: null })
  })
})

describe('the card follows the panel', () => {
  it('shows the title as it is typed, and the derived counts after a save', async () => {
    useNoteStore.getState().edit({ title: 'Plan B' })
    expect(cardNoteNow()?.title).toBe('Plan B')
    useNoteStore.getState().bodyChanged(() => '[{"type":"checkListItem"}]')
    vi.advanceTimersByTime(500)
    await settle()
    expect(cardNoteNow()).toMatchObject({ preview: 'derived text', checkTotal: 2, checkDone: 1 })
  })

  it('shows the due date on the card', () => {
    useNoteStore.getState().edit({ dueDay: '2026-11-28' })
    expect(cardNoteNow()).toMatchObject({ dueDay: '2026-11-28', dueTime: null })
  })

  it('colors through an undoable canvas op when the note has a card', () => {
    useNoteStore.getState().setColor('sky')
    expect(cardNoteNow()?.color).toBe('sky')
    expect(update).not.toHaveBeenCalled()
  })

  it('counts a new link on the card', async () => {
    linksAdd.mockResolvedValue({
      id: 'k1',
      noteId: 'n1',
      url: 'https://a.dev',
      label: null,
      position: 0,
    })
    await useNoteStore.getState().addLink('https://a.dev', null)
    expect(cardNoteNow()?.linkCount).toBe(1)
  })

  it('takes a title renamed on the card', () => {
    useCanvasStore.getState().syncNote('n1', { title: 'From the card' })
    expect(useNoteStore.getState().note?.title).toBe('From the card')
  })
})

describe('failures', () => {
  it('keeps the edit and retries after a failed save', async () => {
    update.mockRejectedValueOnce(new Error('disk full'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    useNoteStore.getState().edit({ title: 'Kept' })
    vi.advanceTimersByTime(500)
    await settle()
    expect(useNoteStore.getState().status).toBe('error')
    vi.advanceTimersByTime(2000)
    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenLastCalledWith('n1', { title: 'Kept' })
    error.mockRestore()
  })
})
