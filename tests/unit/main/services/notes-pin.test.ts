import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { CanvasService } from '../../../../src/main/services/canvas'
import { NotesService } from '../../../../src/main/services/notes'

let handle: DbHandle
let now = 1_000
let notes: NotesService
let canvas: CanvasService

beforeEach(() => {
  handle = openDatabase(':memory:')
  now = 1_000
  notes = new NotesService({ db: () => handle, now: () => now })
  canvas = new CanvasService({ db: () => handle, now: () => now })
})
afterEach(() => handle.close())

const pinnedIds = (): string[] => notes.pinned().map((r) => r.id)

describe('pinning notes', () => {
  it('pins at the end of the list and unpins', () => {
    for (const id of ['a', 'b', 'c']) notes.create({ id, title: id, color: 'stone' })
    now = 2_000
    expect(notes.setPinned('b', true).pinnedAt).toBe(2_000)
    now = 3_000
    notes.setPinned('a', true)
    expect(pinnedIds()).toEqual(['b', 'a'])
    expect(notes.pinned()[0]).toMatchObject({ id: 'b', title: 'b', pinnedAt: 2_000 })

    expect(notes.setPinned('b', false).pinnedAt).toBeNull()
    expect(pinnedIds()).toEqual(['a'])
  })

  it('keeps the place of a note pinned twice', () => {
    notes.create({ id: 'a', title: 'a', color: 'stone' })
    notes.create({ id: 'b', title: 'b', color: 'stone' })
    notes.setPinned('a', true)
    now = 2_000
    notes.setPinned('b', true)
    now = 3_000
    expect(notes.setPinned('a', true).pinnedAt).toBe(1_000)
    expect(pinnedIds()).toEqual(['a', 'b'])
  })

  it("isn't an edit: updated_at stays", () => {
    notes.create({ id: 'a', title: 'a', color: 'stone' })
    now = 5_000
    expect(notes.setPinned('a', true).updatedAt).toBe(1_000)
  })

  it('lists done notes but hides deleted ones until they are restored', () => {
    notes.create({ id: 'a', title: 'a', color: 'stone' })
    notes.create({ id: 'b', title: 'b', color: 'stone' })
    notes.setPinned('a', true)
    notes.setPinned('b', true)
    notes.setDone('a', true)
    notes.remove('b')
    expect(pinnedIds()).toEqual(['a'])
    notes.restore('b')
    expect(pinnedIds()).toEqual(['a', 'b'])
  })

  it('refuses to pin a missing or deleted note', () => {
    notes.create({ id: 'a', title: 'a', color: 'stone' })
    notes.remove('a')
    expect(() => notes.setPinned('a', true)).toThrow(/missing note/)
    expect(() => notes.setPinned('nope', true)).toThrow(/missing note/)
  })

  it("doesn't pin a duplicate", () => {
    notes.create({ id: 'a', title: 'a', color: 'stone' })
    notes.setPinned('a', true)
    const copy = notes.duplicate('a')
    expect(copy.pinnedAt).toBeNull()
    expect(pinnedIds()).toEqual(['a'])
  })

  it('shows the pin on the note card and in list rows', () => {
    canvas.apply([
      {
        op: 'create',
        item: {
          id: 'c1',
          kind: 'note',
          refId: 'a',
          url: null,
          title: null,
          x: 0,
          y: 0,
          w: 240,
          h: 100,
          z: 0,
        },
        note: { id: 'a', title: 'a', color: 'stone' },
      },
    ])
    notes.setPinned('a', true)
    expect(canvas.load()[0]?.note?.pinnedAt).toBe(1_000)
    const [row] = notes.list({ tab: 'open', colors: [], text: '', sort: 'edited' })
    expect(row).toMatchObject({ id: 'a', pinnedAt: 1_000, onCanvas: true })
  })
})
