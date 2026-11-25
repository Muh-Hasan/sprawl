import { describe, expect, it } from 'vitest'
import type { CanvasItem, CanvasOp } from '../../../../../src/shared/types'
import {
  drawnNoteRect,
  inputOf,
  invertOps,
  NOTE_SIZE,
  reduceOps,
  resizeRect,
  restackOps,
  snapMove,
  snapTo,
  type Items,
} from '../../../../../src/renderer/views/canvas/ops'
import { cardNote } from '../../../helpers/cardNote'

const card = (id: string, over: Partial<CanvasItem> = {}): CanvasItem => ({
  id,
  kind: 'note',
  refId: `n-${id}`,
  url: null,
  title: null,
  x: 0,
  y: 0,
  w: 220,
  h: 64,
  z: 1,
  createdAt: 1,
  updatedAt: 1,
  note: cardNote({ title: id, color: 'stone', preview: '' }),
  ...over,
})

const itemsOf = (...cards: CanvasItem[]): Items => new Map(cards.map((c) => [c.id, c]))

/** What a card looks like, minus the timestamps that apply() sets. */
const shape = (items: Items) =>
  [...items.values()].map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest)

const lookup = (items: Items) => (noteId: string) =>
  [...items.values()].find((i) => i.refId === noteId)?.note

/** Applies `ops`, then their inverse, and checks the canvas is back where it started. */
function roundTrip(before: Items, ops: CanvasOp[]): CanvasOp[] {
  const inverse = invertOps(before, ops)
  const after = reduceOps(before, ops)
  const back = reduceOps(after, inverse, 0, lookup(before))
  expect(shape(back)).toEqual(shape(before))
  return inverse
}

describe('reduceOps', () => {
  it('applies create, update and delete to a copy', () => {
    const empty: Items = new Map()
    const create: CanvasOp = {
      op: 'create',
      item: inputOf(card('a')),
      note: { id: 'n-a', title: 'a', color: 'stone' },
    }
    const one = reduceOps(empty, [create], 5)
    expect(empty.size).toBe(0)
    expect(one.get('a')).toMatchObject({
      createdAt: 5,
      note: cardNote({ title: 'a', preview: '' }),
    })
    const two = reduceOps(one, [
      { op: 'update', id: 'a', patch: { x: 50 } },
      { op: 'update', id: 'gone', patch: { x: 1 } },
    ])
    expect(two.get('a')?.x).toBe(50)
    expect(reduceOps(two, [{ op: 'delete', id: 'a' }]).size).toBe(0)
  })

  it('previews a pasted body, and a copy shows its source preview', () => {
    const src = card('a', { note: cardNote({ title: 'a', color: 'sky', preview: 'hello' }) })
    const items = reduceOps(
      itemsOf(src),
      [
        {
          op: 'create',
          item: { ...card('b'), refId: 'n-b' },
          note: { id: 'n-b', title: 'b', color: 'stone', body: 'line 1\nline 2' },
        },
        {
          op: 'create',
          item: { ...card('c'), refId: 'n-c' },
          note: { id: 'n-c', title: 'a', color: 'sky', copyOf: 'n-a' },
        },
      ],
      1,
      lookup(itemsOf(src)),
    )
    expect(items.get('b')?.note?.preview).toBe('line 1\nline 2')
    expect(items.get('c')?.note?.preview).toBe('hello')
  })
})

describe('invertOps', () => {
  const a = card('a', { x: 10, y: 20, z: 3 })
  const b = card('b', { x: 400, note: cardNote({ title: 'b', color: 'sage', preview: 'p' }) })

  it('inverts a create into a delete', () => {
    const create: CanvasOp = {
      op: 'create',
      item: {
        id: 'c',
        kind: 'note',
        refId: 'n-c',
        url: null,
        title: null,
        x: 0,
        y: 0,
        w: 220,
        h: 64,
        z: 9,
      },
      note: { id: 'n-c', title: '', color: 'stone' },
    }
    expect(roundTrip(itemsOf(a), [create])).toEqual([{ op: 'delete', id: 'c' }])
  })

  it('inverts a delete into a restore of the same card', () => {
    const inverse = roundTrip(itemsOf(a, b), [{ op: 'delete', id: 'b' }])
    expect(inverse).toEqual([
      {
        op: 'restore',
        item: {
          id: 'b',
          kind: 'note',
          refId: 'n-b',
          url: null,
          title: null,
          x: 400,
          y: 0,
          w: 220,
          h: 64,
          z: 1,
        },
      },
    ])
  })

  it('inverts a restore into a delete', () => {
    const item = {
      id: 'a',
      kind: 'note' as const,
      refId: 'n-a',
      url: null,
      title: null,
      x: 0,
      y: 0,
      w: 220,
      h: 64,
      z: 1,
    }
    expect(invertOps(new Map(), [{ op: 'restore', item }])).toEqual([{ op: 'delete', id: 'a' }])
  })

  it('inverts an update into the old values of the patched fields', () => {
    const inverse = roundTrip(itemsOf(a), [{ op: 'update', id: 'a', patch: { x: 99, w: 300 } }])
    expect(inverse).toEqual([{ op: 'update', id: 'a', patch: { x: 10, w: 220 } }])
  })

  it('inverts setColor into the previous color', () => {
    const inverse = roundTrip(itemsOf(b), [{ op: 'setColor', id: 'b', color: 'rose' }])
    expect(inverse).toEqual([{ op: 'setColor', id: 'b', color: 'sage' }])
  })

  it('inverts setDone into the previous done state, and skips one that changes nothing', () => {
    const inverse = roundTrip(itemsOf(b), [{ op: 'setDone', id: 'b', done: true }])
    expect(inverse).toEqual([{ op: 'setDone', id: 'b', done: false }])
    const done = card('d', { note: cardNote({ doneAt: 5 }) })
    expect(invertOps(itemsOf(done), [{ op: 'setDone', id: 'd', done: true }])).toEqual([])
    expect(invertOps(itemsOf(done), [{ op: 'setDone', id: 'd', done: false }])).toEqual([
      { op: 'setDone', id: 'd', done: true },
    ])
  })

  it('applies setDone with the time it ran, and clears it on undo', () => {
    const done = reduceOps(itemsOf(b), [{ op: 'setDone', id: 'b', done: true }], 1234)
    expect(done.get('b')?.note?.doneAt).toBe(1234)
    const undone = reduceOps(done, [{ op: 'setDone', id: 'b', done: false }], 2000)
    expect(undone.get('b')?.note?.doneAt).toBeNull()
  })

  it('skips ops on cards that are gone, and inverts a mixed batch in reverse order', () => {
    expect(invertOps(itemsOf(a), [{ op: 'update', id: 'x', patch: { x: 1 } }])).toEqual([])
    const ops: CanvasOp[] = [
      { op: 'update', id: 'a', patch: { x: 1 } },
      { op: 'update', id: 'a', patch: { x: 2 } },
      { op: 'setColor', id: 'b', color: 'sky' },
      { op: 'delete', id: 'b' },
    ]
    const inverse = roundTrip(itemsOf(a, b), ops)
    expect(inverse.map((op) => op.op)).toEqual(['restore', 'setColor', 'update', 'update'])
    expect(inverse.at(-1)).toEqual({ op: 'update', id: 'a', patch: { x: 10 } })
  })
})

describe('snap math', () => {
  it('rounds to the 8px grid', () => {
    expect([snapTo(3), snapTo(4), snapTo(-5), snapTo(12), snapTo(16)]).toEqual([0, 8, -8, 16, 16])
  })

  it("snaps a move so the grabbed card's corner lands on the grid", () => {
    expect(snapMove({ x: 5, y: 10 }, 10, 3, true)).toEqual({ dx: 11, dy: 6 })
    expect(snapMove({ x: 5, y: 10 }, 10, 3, false)).toEqual({ dx: 10, dy: 3 })
  })

  it('resizes from any corner within the limits, keeping the far corner fixed', () => {
    const r = { x: 0, y: 0, w: 220, h: 64 }
    expect(resizeRect(r, 'se', 30, 40, NOTE_SIZE, true)).toEqual({ x: 0, y: 0, w: 248, h: 104 })
    expect(resizeRect(r, 'nw', 20, -20, NOTE_SIZE, false)).toEqual({ x: 20, y: -20, w: 200, h: 84 })
    // Clamped to 160–480 wide and 64–320 tall; the opposite edge doesn't move.
    expect(resizeRect(r, 'nw', 200, 50, NOTE_SIZE, false)).toEqual({ x: 60, y: 0, w: 160, h: 64 })
    expect(resizeRect(r, 'se', 900, 900, NOTE_SIZE, false)).toEqual({ x: 0, y: 0, w: 480, h: 320 })
    expect(resizeRect(r, 'ne', -100, -10, NOTE_SIZE, false)).toEqual({
      x: 0,
      y: -10,
      w: 160,
      h: 74,
    })
  })
})

describe('restackOps', () => {
  const items = itemsOf(
    card('a', { z: 1 }),
    card('b', { z: 2 }),
    card('c', { z: 3 }),
    card('d', { z: 4 }),
  )

  it('brings the selection to the front, keeping its order', () => {
    expect(restackOps(items, ['b', 'a'], 'front')).toEqual([
      { op: 'update', id: 'a', patch: { z: 5 } },
      { op: 'update', id: 'b', patch: { z: 6 } },
    ])
    expect(restackOps(items, ['d'], 'front')).toEqual([])
  })

  it('sends the selection to the back', () => {
    expect(restackOps(items, ['c', 'd'], 'back')).toEqual([
      { op: 'update', id: 'c', patch: { z: -1 } },
      { op: 'update', id: 'd', patch: { z: 0 } },
    ])
    expect(restackOps(items, ['a'], 'back')).toEqual([])
  })
})

describe('drawnNoteRect', () => {
  it('draws from the start corner in any direction, snapped and within the limits', () => {
    expect(drawnNoteRect({ x: 3, y: 5 }, { x: 300, y: 150 }, true)).toEqual({
      x: 0,
      y: 8,
      w: 304,
      h: 144,
    })
    expect(drawnNoteRect({ x: 400, y: 400 }, { x: 100, y: 300 }, false)).toEqual({
      x: 100,
      y: 300,
      w: 300,
      h: 100,
    })
    // Too small grows to the minimum, too big stops at the maximum.
    expect(drawnNoteRect({ x: 0, y: 0 }, { x: 10, y: 10 }, false)).toEqual({
      x: 0,
      y: 0,
      w: 160,
      h: 64,
    })
    expect(drawnNoteRect({ x: 0, y: 0 }, { x: -2000, y: -2000 }, false)).toEqual({
      x: -480,
      y: -320,
      w: 480,
      h: 320,
    })
  })
})
