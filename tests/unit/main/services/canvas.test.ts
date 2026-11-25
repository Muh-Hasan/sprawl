import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { CanvasService } from '../../../../src/main/services/canvas'
import type { CanvasItemInput, CanvasOp } from '../../../../src/shared/types'

let handle: DbHandle
let now = 1_000
let canvas: CanvasService

beforeEach(() => {
  handle = openDatabase(':memory:')
  now = 1_000
  canvas = new CanvasService({ db: () => handle, now: () => now })
})
afterEach(() => handle.close())

const noteCard = (id: string, noteId: string, over: Partial<CanvasItemInput> = {}): CanvasOp => ({
  op: 'create',
  item: {
    id,
    kind: 'note',
    refId: noteId,
    url: null,
    title: null,
    x: 0,
    y: 0,
    w: 220,
    h: 96,
    z: 1,
    ...over,
  },
  note: { id: noteId, title: `Note ${noteId}`, color: 'sage' },
})

const linkCard = (id: string): CanvasOp => ({
  op: 'create',
  item: {
    id,
    kind: 'link',
    refId: null,
    url: 'https://example.com',
    title: 'Example',
    x: 10,
    y: 20,
    w: 260,
    h: 56,
    z: 2,
  },
})

const count = (table: string, where = '1'): number =>
  handle.sqlite.prepare(`SELECT count(*) FROM ${table} WHERE ${where}`).pluck().get() as number

describe('CanvasService.apply', () => {
  it('persists a create, with its note in the same transaction', () => {
    const { created } = canvas.apply([noteCard('c1', 'n1', { x: 40, y: -8 }), linkCard('l1')])
    expect(created.map((c) => c.id)).toEqual(['c1', 'l1'])
    expect(created[0]).toMatchObject({
      kind: 'note',
      refId: 'n1',
      x: 40,
      y: -8,
      createdAt: 1_000,
      updatedAt: 1_000,
      note: { title: 'Note n1', color: 'sage' },
    })
    expect(created[1]).not.toHaveProperty('note')
    expect(count('canvas_items')).toBe(2)
    expect(count('notes', "id = 'n1' AND deleted_at IS NULL")).toBe(1)
  })

  it('persists an update and bumps updated_at', () => {
    canvas.apply([noteCard('c1', 'n1')])
    now = 2_000
    canvas.apply([{ op: 'update', id: 'c1', patch: { x: 300, y: 120, w: 240, z: 9 } }])
    const [item] = canvas.load()
    expect(item).toMatchObject({ x: 300, y: 120, w: 240, h: 96, z: 9, updatedAt: 2_000 })
  })

  it('persists a delete, soft-deleting the note', () => {
    canvas.apply([noteCard('c1', 'n1'), linkCard('l1')])
    now = 3_000
    canvas.apply([{ op: 'delete', id: 'c1' }])
    expect(canvas.load().map((i) => i.id)).toEqual(['l1'])
    expect(
      handle.sqlite.prepare("SELECT deleted_at FROM notes WHERE id = 'n1'").pluck().get(),
    ).toBe(3_000)
  })

  it('treats an update or delete of a missing card as a no-op', () => {
    canvas.apply([noteCard('c1', 'n1')])
    expect(() =>
      canvas.apply([
        { op: 'update', id: 'gone', patch: { x: 1 } },
        { op: 'delete', id: 'gone' },
      ]),
    ).not.toThrow()
    expect(count('canvas_items')).toBe(1)
  })

  it('rolls back the whole batch when one op fails', () => {
    canvas.apply([noteCard('c1', 'n1')])
    // A second card for the same note breaks the one-card-per-note index.
    const dup: CanvasOp = {
      op: 'create',
      item: {
        id: 'c2',
        kind: 'note',
        refId: 'n1',
        url: null,
        title: null,
        x: 0,
        y: 0,
        w: 220,
        h: 96,
        z: 2,
      },
    }
    expect(() =>
      canvas.apply([noteCard('c3', 'n3'), { op: 'update', id: 'c1', patch: { x: 99 } }, dup]),
    ).toThrow()
    expect(count('canvas_items')).toBe(1)
    expect(count('notes')).toBe(1)
    expect(canvas.load()[0]?.x).toBe(0)
  })

  it("refuses a card for a note that doesn't exist or is deleted", () => {
    const orphan: CanvasOp = {
      op: 'create',
      item: {
        id: 'c9',
        kind: 'note',
        refId: 'nope',
        url: null,
        title: null,
        x: 0,
        y: 0,
        w: 220,
        h: 96,
        z: 1,
      },
    }
    expect(() => canvas.apply([orphan])).toThrow(/missing note/)
    canvas.apply([noteCard('c1', 'n1')])
    canvas.apply([{ op: 'delete', id: 'c1' }])
    expect(() =>
      canvas.apply([{ ...orphan, item: { ...orphan.item, refId: 'n1' } } as CanvasOp]),
    ).toThrow(/missing note/)
  })
})

describe('CanvasService.load', () => {
  it('returns every card in z order with its note fields', () => {
    canvas.apply([
      noteCard('top', 'n1', { z: 5 }),
      linkCard('mid'),
      noteCard('low', 'n2', { z: 0 }),
    ])
    const items = canvas.load()
    expect(items.map((i) => i.id)).toEqual(['low', 'mid', 'top'])
    expect(items[2]?.note).toEqual({ title: 'Note n1', color: 'sage', preview: '' })
    expect(items[1]?.note).toBeUndefined()
  })

  it('throws with no vault open', () => {
    const closed = new CanvasService({ db: () => null })
    expect(() => closed.load()).toThrow(/No vault/)
  })
})

describe('CanvasService restore and setColor', () => {
  const rows = () => ({
    items: count('canvas_items'),
    notes: count('notes'),
    live: count('notes', 'deleted_at IS NULL'),
  })

  it('round-trips a note card through create, delete and restore with no orphan rows', () => {
    const create = noteCard('c1', 'n1', { x: 16, y: 24 })
    canvas.apply([create])
    const input = create.op === 'create' ? create.item : null
    now = 2_000
    canvas.apply([{ op: 'delete', id: 'c1' }])
    expect(rows()).toEqual({ items: 0, notes: 1, live: 0 })

    now = 3_000
    const { created } = canvas.apply([{ op: 'restore', item: input! }])
    expect(created[0]).toMatchObject({ id: 'c1', x: 16, y: 24, note: { title: 'Note n1' } })
    expect(rows()).toEqual({ items: 1, notes: 1, live: 1 })
    expect(canvas.load().map((i) => i.id)).toEqual(['c1'])

    // Undoing the create (a delete) and redoing it (a restore) never duplicates anything.
    canvas.apply([{ op: 'delete', id: 'c1' }])
    canvas.apply([{ op: 'restore', item: input! }])
    canvas.apply([{ op: 'delete', id: 'c1' }])
    expect(rows()).toEqual({ items: 0, notes: 1, live: 0 })
  })

  it('refuses to restore a card whose note was purged, rolling back the batch', () => {
    const create = noteCard('c1', 'n1')
    canvas.apply([create])
    canvas.apply([{ op: 'delete', id: 'c1' }])
    handle.sqlite.prepare("DELETE FROM notes WHERE id = 'n1'").run()
    const item = create.op === 'create' ? create.item : null
    expect(() => canvas.apply([linkCard('l1'), { op: 'restore', item: item! }])).toThrow(
      /purged note/,
    )
    expect(count('canvas_items')).toBe(0)
  })

  it('keeps one card per note', () => {
    canvas.apply([noteCard('c1', 'n1')])
    const second: CanvasOp = {
      op: 'restore',
      item: {
        id: 'c2',
        kind: 'note',
        refId: 'n1',
        url: null,
        title: null,
        x: 0,
        y: 0,
        w: 220,
        h: 96,
        z: 2,
      },
    }
    expect(() => canvas.apply([second])).toThrow(/UNIQUE/)
    expect(count('canvas_items')).toBe(1)
  })

  it("sets a note card's color, and ignores a card that's gone", () => {
    canvas.apply([noteCard('c1', 'n1'), linkCard('l1')])
    now = 5_000
    canvas.apply([
      { op: 'setColor', id: 'c1', color: 'rose' },
      { op: 'setColor', id: 'gone', color: 'sky' },
    ])
    expect(canvas.load().find((i) => i.id === 'c1')?.note?.color).toBe('rose')
    expect(
      handle.sqlite.prepare("SELECT updated_at FROM notes WHERE id = 'n1'").pluck().get(),
    ).toBe(5_000)
    expect(() => canvas.apply([{ op: 'setColor', id: 'l1', color: 'sky' }])).toThrow(
      /Only note cards/,
    )
  })

  it('creates a pasted note with a body, and shows its start as the preview', () => {
    const op = noteCard('c1', 'n1')
    if (op.op !== 'create') throw new Error('expected a create')
    const { created } = canvas.apply([
      { ...op, note: { id: 'n1', title: 'Groceries', color: 'stone', body: 'eggs\nmilk' } },
    ])
    expect(created[0]?.note).toEqual({ title: 'Groceries', color: 'stone', preview: 'eggs\nmilk' })
    const json = handle.sqlite.prepare("SELECT body_json FROM notes WHERE id = 'n1'").pluck().get()
    expect(JSON.parse(json as string)).toHaveLength(2)
  })

  it('creates a copy of a note (body and links) for a duplicated card', () => {
    canvas.apply([noteCard('c1', 'n1')])
    handle.sqlite
      .prepare("UPDATE notes SET body_text = 'hello', due_day = '2026-12-01' WHERE id = 'n1'")
      .run()
    handle.sqlite
      .prepare("INSERT INTO note_links VALUES ('k1', 'n1', 'https://example.com', 'Ex', 0)")
      .run()
    const op = noteCard('c2', 'n2')
    if (op.op !== 'create') throw new Error('expected a create')
    canvas.apply([{ ...op, note: { id: 'n2', title: 'Note n1', color: 'sky', copyOf: 'n1' } }])
    expect(canvas.load().find((i) => i.id === 'c2')?.note).toEqual({
      title: 'Note n1',
      color: 'sky',
      preview: 'hello',
    })
    expect(count('note_links', "note_id = 'n2'")).toBe(1)
    expect(count('notes', "id = 'n2' AND due_day IS NULL")).toBe(1)
  })
})
