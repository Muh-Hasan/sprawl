import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { CanvasService } from '../../../../src/main/services/canvas'
import {
  buildNoteListQuery,
  countOverdue,
  firstLineOf,
} from '../../../../src/main/services/noteList'
import { NotesService } from '../../../../src/main/services/notes'
import { localInstant } from '../../../../src/shared/due'
import type { NoteListQuery } from '../../../../src/shared/types'

const savedTz = process.env['TZ']
afterAll(() => {
  if (savedTz === undefined) delete process.env['TZ']
  else process.env['TZ'] = savedTz
})

let handle: DbHandle
let now = 0
let notes: NotesService
let canvas: CanvasService

const q = (over: Partial<NoteListQuery> = {}): NoteListQuery => ({
  tab: 'all',
  colors: [],
  text: '',
  sort: 'edited',
  ...over,
})
const ids = (over: Partial<NoteListQuery> = {}): string[] => notes.list(q(over)).map((r) => r.id)

/** A note created at `at` (minutes after 09:00 on 25 Nov), with optional fields. */
function note(
  id: string,
  at: number,
  over: {
    title?: string
    color?: 'stone' | 'sand' | 'sage' | 'sky'
    due?: [string, string | null]
  } = {},
): void {
  now = localInstant('2026-11-25', '09:00') + at * 60_000
  notes.create({ id, title: over.title ?? id, color: over.color ?? 'stone' })
  if (over.due) notes.update(id, { dueDay: over.due[0], dueTime: over.due[1] })
}

beforeEach(() => {
  process.env['TZ'] = 'Europe/London'
  handle = openDatabase(':memory:')
  const deps = { db: () => handle, now: () => now }
  notes = new NotesService(deps)
  canvas = new CanvasService(deps)
})
afterEach(() => handle.close())

describe('buildNoteListQuery', () => {
  it('always leaves out deleted notes, and filters each tab', () => {
    expect(buildNoteListQuery(q({ tab: 'all' })).sql).toMatch(/WHERE n\.deleted_at IS NULL\s+ORDER/)
    expect(buildNoteListQuery(q({ tab: 'open' })).sql).toContain('n.done_at IS NULL')
    expect(buildNoteListQuery(q({ tab: 'due' })).sql).toContain(
      'n.done_at IS NULL AND n.due_day IS NOT NULL',
    )
    expect(buildNoteListQuery(q({ tab: 'done' })).sql).toContain('n.done_at IS NOT NULL')
  })

  it('binds colors and the title filter as parameters, never inline', () => {
    const { sql, params } = buildNoteListQuery(q({ colors: ['sage', 'rose'], text: " 50%_off'" }))
    expect(sql).toContain('n.color IN (@color0, @color1)')
    expect(sql).toContain("n.title LIKE @text ESCAPE '\\'")
    expect(params).toEqual({ color0: 'sage', color1: 'rose', text: "%50\\%\\_off'%" })
  })

  it('sorts by the chosen order, except Due (by due date) and Done (by done time)', () => {
    expect(buildNoteListQuery(q({ sort: 'created' })).sql).toContain('ORDER BY n.created_at DESC')
    expect(buildNoteListQuery(q({ tab: 'due', sort: 'title' })).sql).toContain(
      'ORDER BY n.due_day IS NULL, n.due_day, n.due_time IS NULL, n.due_time',
    )
    expect(buildNoteListQuery(q({ tab: 'done', sort: 'title' })).sql).toContain(
      'ORDER BY n.done_at DESC',
    )
  })
})

describe('notes.list', () => {
  beforeEach(() => {
    note('a', 0, { title: 'Buy milk', color: 'sage', due: ['2026-11-27', null] })
    note('b', 1, { title: 'call Ali', color: 'sky', due: ['2026-11-25', '08:00'] })
    note('c', 2, { title: '', due: ['2026-11-25', '15:00'] })
    note('d', 3, { title: 'Zebra', color: 'sand' })
    note('e', 4, { title: 'archive', due: ['2026-11-25', null] })
    now = localInstant('2026-11-25', '12:00')
  })

  it('Open: every note not done, most recently edited first', () => {
    notes.setDone('e', true)
    expect(ids({ tab: 'open' })).toEqual(['d', 'c', 'b', 'a'])
  })

  it('Due: notes with a due date, soonest first (a time before "sometime that day")', () => {
    expect(ids({ tab: 'due' })).toEqual(['b', 'c', 'e', 'a'])
    notes.setDone('b', true)
    expect(ids({ tab: 'due' })).toEqual(['c', 'e', 'a'])
  })

  it('Done: most recently done first; All has both', () => {
    now += 1000
    notes.setDone('a', true)
    now += 1000
    notes.setDone('d', true)
    expect(ids({ tab: 'done' })).toEqual(['d', 'a'])
    expect(ids({ tab: 'all' })).toHaveLength(5)
  })

  it('sorts by created, by title (ignoring case, untitled last) and by due date', () => {
    notes.update('a', { title: 'Buy oat milk' }) // edited last, created first
    expect(ids({ sort: 'edited' })[0]).toBe('a')
    expect(ids({ sort: 'created' })).toEqual(['e', 'd', 'c', 'b', 'a'])
    expect(ids({ sort: 'title' })).toEqual(['e', 'a', 'b', 'd', 'c'])
    expect(ids({ sort: 'due' })).toEqual(['b', 'c', 'e', 'a', 'd'])
  })

  it('filters by color (several at once) and by title, ignoring case', () => {
    expect(ids({ colors: ['sage', 'sand'] }).sort()).toEqual(['a', 'd'])
    expect(ids({ text: 'ALI' })).toEqual(['b'])
    expect(ids({ text: '  milk ', colors: ['sky'] })).toEqual([])
    expect(ids({ text: '%' })).toEqual([])
  })

  it('leaves out deleted notes', () => {
    notes.remove('d')
    expect(ids()).not.toContain('d')
  })

  it('gives each row its first body line, counts and whether it has a card', () => {
    notes.update('a', {
      bodyJson: JSON.stringify([
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '  2 litres  ' }] },
        { type: 'checkListItem', props: { checked: true }, content: [{ type: 'text', text: 'x' }] },
      ]),
    })
    notes.addLink('a', 'https://example.com', null)
    canvas.placeNote('a', { x: 0, y: 0 })
    const row = notes.list(q()).find((r) => r.id === 'a')!
    expect(row).toMatchObject({
      title: 'Buy milk',
      color: 'sage',
      firstLine: '2 litres',
      checkTotal: 1,
      checkDone: 1,
      linkCount: 1,
      dueDay: '2026-11-27',
      onCanvas: true,
    })
    expect(notes.list(q()).find((r) => r.id === 'b')!.onCanvas).toBe(false)
  })
})

describe('notes.listCounts', () => {
  it('counts each tab, after the color and title filter, matching what the tab lists', () => {
    note('a', 0, { title: 'Buy milk', color: 'sage', due: ['2026-11-27', null] })
    note('b', 1, { title: 'call Ali', color: 'sky', due: ['2026-11-25', '08:00'] })
    note('c', 2, { title: 'Zebra', color: 'sage' })
    note('d', 3, { title: 'Gone', color: 'sage' })
    notes.setDone('c', true)
    notes.remove('d')
    expect(notes.listCounts({ colors: [], text: '' })).toEqual({
      open: 2,
      due: 2,
      done: 1,
      all: 3,
    })
    expect(notes.listCounts({ colors: ['sage'], text: '' })).toEqual({
      open: 1,
      due: 1,
      done: 1,
      all: 2,
    })
    expect(notes.listCounts({ colors: [], text: 'ALI' })).toEqual({
      open: 1,
      due: 1,
      done: 0,
      all: 1,
    })
    for (const tab of ['open', 'due', 'done', 'all'] as const) {
      expect(ids({ tab, colors: ['sage'] })).toHaveLength(
        notes.listCounts({ colors: ['sage'], text: '' })[tab],
      )
    }
  })

  it('is all zeros with no notes', () => {
    expect(notes.listCounts({ colors: ['rose'], text: '' })).toEqual({
      open: 0,
      due: 0,
      done: 0,
      all: 0,
    })
  })
})

describe('countOverdue', () => {
  it('counts open notes past their time, or past the end of a day without one', () => {
    note('a', 0, { due: ['2026-11-25', '08:00'] })
    note('b', 0, { due: ['2026-11-25', null] })
    note('c', 0, { due: ['2026-11-24', null] })
    note('d', 0, { due: ['2026-11-20', '10:00'] })
    notes.setDone('d', true)
    expect(countOverdue(handle, localInstant('2026-11-25', '07:59'))).toBe(1)
    expect(countOverdue(handle, localInstant('2026-11-25', '08:00'))).toBe(2)
    expect(countOverdue(handle, localInstant('2026-11-26', '00:00'))).toBe(3)
  })
})

describe('firstLineOf', () => {
  it('finds the first line with text, trimmed and capped', () => {
    expect(firstLineOf('\n \nHello\nWorld')).toBe('Hello')
    expect(firstLineOf('')).toBe('')
    expect(firstLineOf('x'.repeat(500))).toHaveLength(200)
  })
})

describe('canvas.placeNote', () => {
  it('centers a default card on the point, snapped, on top; a placed note keeps its card', () => {
    note('a', 0)
    note('b', 0)
    canvas.apply([
      {
        op: 'create',
        item: {
          id: 'k',
          kind: 'note',
          refId: 'b',
          url: null,
          title: null,
          x: 0,
          y: 0,
          w: 220,
          h: 64,
          z: 7,
        },
      },
    ])
    const card = canvas.placeNote('a', { x: 1003, y: 500 })
    expect(card).toMatchObject({ kind: 'note', refId: 'a', x: 880, y: 472, w: 240, h: 64, z: 8 })
    expect(card.note?.title).toBe('a')
    expect(canvas.placeNote('a', { x: 0, y: 0 }).id).toBe(card.id)
    expect(notes.get('a').onCanvas).toBe(true)
  })

  it('refuses a deleted or missing note', () => {
    note('a', 0)
    notes.remove('a')
    expect(() => canvas.placeNote('a', { x: 0, y: 0 })).toThrow(/missing note/)
    expect(() => canvas.placeNote('nope', { x: 0, y: 0 })).toThrow(/missing note/)
  })
})
