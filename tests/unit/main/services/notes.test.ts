import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { CanvasService } from '../../../../src/main/services/canvas'
import { NotesService, PURGE_AFTER_MS } from '../../../../src/main/services/notes'

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

const count = (table: string, where = '1'): number =>
  handle.sqlite.prepare(`SELECT count(*) FROM ${table} WHERE ${where}`).pluck().get() as number

const run = (sql: string): void => void handle.sqlite.prepare(sql).run()

describe('NotesService', () => {
  it('creates, gets and updates a note', () => {
    const created = notes.create({ id: 'n1', title: 'Plan', color: 'sand' })
    expect(created).toMatchObject({
      id: 'n1',
      title: 'Plan',
      color: 'sand',
      bodyJson: '[]',
      bodyText: '',
      remind: 'none',
      doneAt: null,
      deletedAt: null,
      createdAt: 1_000,
    })
    now = 2_000
    expect(notes.update('n1', { title: 'Plan B', color: 'sky' })).toMatchObject({
      title: 'Plan B',
      color: 'sky',
      updatedAt: 2_000,
    })
    expect(notes.get('n1').title).toBe('Plan B')
    expect(() => notes.get('nope')).toThrow(/No such note/)
  })

  it('turns a pasted body into one paragraph per line', () => {
    const note = notes.create({ id: 'n1', title: 'List', color: 'stone', body: 'a\r\n\nb\n\n' })
    expect(note.bodyText).toBe('a\n\nb')
    const blocks = JSON.parse(note.bodyJson) as { type: string; content: unknown[] }[]
    expect(blocks.map((b) => [b.type, b.content.length])).toEqual([
      ['paragraph', 1],
      ['paragraph', 0],
      ['paragraph', 1],
    ])
  })

  it('soft-deletes and restores, and refuses to update a deleted note', () => {
    notes.create({ id: 'n1', title: 'x', color: 'stone' })
    now = 5_000
    notes.remove('n1')
    expect(notes.get('n1').deletedAt).toBe(5_000)
    expect(() => notes.update('n1', { title: 'y' })).toThrow(/missing note/)
    expect(notes.get('n1').title).toBe('x')
    notes.restore('n1')
    expect(notes.get('n1').deletedAt).toBeNull()
    expect(() => notes.remove('nope')).toThrow(/No such note/)
  })

  it('duplicates the title, body, color and links, but not the due date or done state', () => {
    notes.create({ id: 'n1', title: 'Trip', color: 'lilac', body: 'pack' })
    run("UPDATE notes SET due_day = '2026-12-01', due_time = '09:00', done_at = 7 WHERE id = 'n1'")
    run("INSERT INTO note_links VALUES ('k1', 'n1', 'https://a.example', 'A', 0)")
    run("INSERT INTO note_links VALUES ('k2', 'n1', 'https://b.example', NULL, 1)")
    run("INSERT INTO refs VALUES ('n1', 'note', 'n9')")

    const copy = notes.duplicate('n1')
    expect(copy.id).not.toBe('n1')
    expect(copy).toMatchObject({
      title: 'Trip',
      color: 'lilac',
      bodyText: 'pack',
      dueDay: null,
      dueTime: null,
      doneAt: null,
    })
    expect(copy.bodyJson).toBe(notes.get('n1').bodyJson)
    const links = handle.sqlite
      .prepare(
        'SELECT id, url, label, position FROM note_links WHERE note_id = ? ORDER BY position',
      )
      .all(copy.id) as { id: string; url: string; label: string | null }[]
    expect(links.map((l) => [l.url, l.label])).toEqual([
      ['https://a.example', 'A'],
      ['https://b.example', null],
    ])
    expect(links.every((l) => l.id !== 'k1' && l.id !== 'k2')).toBe(true)
    expect(count('refs', `from_note_id = '${copy.id}'`)).toBe(1)
    expect(count('canvas_items')).toBe(0) // a list/panel duplicate isn't placed
  })
})

describe('purge', () => {
  const DAY = 24 * 60 * 60 * 1000

  it('removes only notes and drawings deleted more than 30 days ago, with their rows', () => {
    now = 100 * DAY
    for (const id of ['old', 'recent', 'live']) {
      canvas.apply([
        {
          op: 'create',
          item: {
            id: `c-${id}`,
            kind: 'note',
            refId: id,
            url: null,
            title: null,
            x: 0,
            y: 0,
            w: 220,
            h: 64,
            z: 1,
          },
          note: { id, title: id, color: 'stone' },
        },
      ])
      run(`INSERT INTO note_links VALUES ('k-${id}', '${id}', 'https://x.example', NULL, 0)`)
      run(`INSERT INTO note_activity VALUES ('${id}', '2026-01-01')`)
      run(
        `INSERT INTO search_index (kind, ref_id, title, body) VALUES ('note', '${id}', '${id}', '')`,
      )
    }
    run("INSERT INTO refs VALUES ('live', 'note', 'old')")
    run("INSERT INTO log_entries VALUES ('e1', '2026-01-01', 1, 'done', 'old', 'old', 1)")
    // `old` lost its card on the canvas; `recent` was removed from the list and keeps its card.
    now = 100 * DAY - PURGE_AFTER_MS - 1
    canvas.apply([{ op: 'delete', id: 'c-old' }])
    now = 100 * DAY - PURGE_AFTER_MS + 1
    notes.remove('recent')
    run(
      `INSERT INTO drawings (id, scene_json, created_at, updated_at, deleted_at)
       VALUES ('d-old', '{}', 0, 0, ${100 * DAY - PURGE_AFTER_MS - 1}),
              ('d-new', '{}', 0, 0, ${100 * DAY - DAY})`,
    )
    run(
      "INSERT INTO canvas_items VALUES ('c-d-old', 'drawing', 'd-old', NULL, NULL, 0, 0, 280, 200, 1, 0, 0)",
    )

    now = 100 * DAY
    expect(notes.purge()).toEqual({ notes: 1, drawings: 1 })

    expect(handle.sqlite.prepare('SELECT id FROM notes ORDER BY id').pluck().all()).toEqual([
      'live',
      'recent',
    ])
    expect(handle.sqlite.prepare('SELECT id FROM drawings').pluck().all()).toEqual(['d-new'])
    expect(count('canvas_items', "ref_id IN ('old', 'd-old')")).toBe(0)
    expect(count('canvas_items')).toBe(2)
    expect(count('note_links', "note_id = 'old'")).toBe(0)
    expect(count('note_activity', "note_id = 'old'")).toBe(0)
    expect(count('refs')).toBe(0)
    expect(count('search_index', "ref_id = 'old'")).toBe(0)
    expect(count('search_index')).toBe(2)
    // The log keeps its title snapshot.
    expect(handle.sqlite.prepare('SELECT note_id, text FROM log_entries').get()).toEqual({
      note_id: null,
      text: 'old',
    })
  })
})
