import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { migrate, openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { MIGRATIONS } from '../../../../src/main/db/migrations'

const TABLES = [
  'attachments',
  'canvas_items',
  'drawings',
  'log_entries',
  'note_activity',
  'note_links',
  'notes',
  'refs',
  'search_index',
  'settings',
]

let handle: DbHandle | null = null
afterEach(() => {
  handle?.close()
  handle = null
})

function names(sqlite: Database.Database, type: 'table' | 'index'): string[] {
  return (
    sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%'`)
      .all(type) as { name: string }[]
  ).map((r) => r.name)
}

describe('migrations', () => {
  it('apply the full schema to an empty database', () => {
    handle = openDatabase(':memory:')
    const { sqlite } = handle
    for (const table of TABLES) expect(names(sqlite, 'table')).toContain(table)
    expect(names(sqlite, 'index')).toEqual(
      expect.arrayContaining([
        'canvas_items_ref',
        'notes_remind',
        'notes_due',
        'notes_pinned',
        'log_entries_day',
      ]),
    )
    expect(sqlite.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length)
  })

  it('turn foreign keys on', () => {
    handle = openDatabase(':memory:')
    expect(handle.sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
  })

  it('are idempotent: a second run applies nothing', () => {
    const sqlite = new Database(':memory:')
    try {
      expect(migrate(sqlite)).toBe(MIGRATIONS.length)
      expect(migrate(sqlite)).toBe(0)
    } finally {
      sqlite.close()
    }
  })

  it('refuse a vault from a newer schema', () => {
    const sqlite = new Database(':memory:')
    try {
      sqlite.pragma(`user_version = ${MIGRATIONS.length + 1}`)
      expect(() => migrate(sqlite)).toThrow(/newer version of Sprawl/)
    } finally {
      sqlite.close()
    }
  })

  it('create a working FTS5 search index', () => {
    handle = openDatabase(':memory:')
    const { sqlite } = handle
    sqlite
      .prepare('INSERT INTO search_index (kind, ref_id, title, body) VALUES (?, ?, ?, ?)')
      .run('note', 'n1', 'Café plans', 'Book a table')
    // remove_diacritics: "cafe" matches "Café".
    const rows = sqlite
      .prepare(`SELECT ref_id FROM search_index WHERE search_index MATCH 'cafe'`)
      .all()
    expect(rows).toEqual([{ ref_id: 'n1' }])
  })

  it('allow at most one canvas card per note', () => {
    handle = openDatabase(':memory:')
    const insert = handle.sqlite.prepare(
      `INSERT INTO canvas_items (id, kind, ref_id, x, y, w, h, z, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, 220, 100, 0, 0, 0)`,
    )
    insert.run('c1', 'note', 'n1')
    expect(() => insert.run('c2', 'note', 'n1')).toThrow(/UNIQUE/)
    // Link cards have no ref_id, so any number of them is fine.
    insert.run('c3', 'link', null)
    insert.run('c4', 'link', null)
  })

  it('cascade note deletes to links and set log entries to null', () => {
    handle = openDatabase(':memory:')
    const { sqlite } = handle
    sqlite.prepare(`INSERT INTO notes (id, created_at, updated_at) VALUES ('n1', 0, 0)`).run()
    sqlite
      .prepare(
        `INSERT INTO note_links (id, note_id, url, position) VALUES ('l1', 'n1', 'https://a.b', 0)`,
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO log_entries (id, day, at, kind, text, note_id, created_at)
         VALUES ('e1', '2026-11-24', 0, 'done', 'Title', 'n1', 0)`,
      )
      .run()
    sqlite.prepare(`DELETE FROM notes WHERE id = 'n1'`).run()
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM note_links').get()).toEqual({ n: 0 })
    expect(sqlite.prepare('SELECT note_id, text FROM log_entries').get()).toEqual({
      note_id: null,
      text: 'Title',
    })
  })

  it('add notes.pinned_at to a vault made before it, keeping its notes', () => {
    const sqlite = new Database(':memory:')
    try {
      // A vault from before pinning: only the first migration ran.
      sqlite.exec(MIGRATIONS[0]!.sql)
      sqlite.pragma('user_version = 1')
      sqlite
        .prepare(`INSERT INTO notes (id, title, created_at, updated_at) VALUES ('n1', 'Old', 1, 1)`)
        .run()
      expect(migrate(sqlite)).toBe(MIGRATIONS.length - 1)
      expect(sqlite.prepare('SELECT title, pinned_at FROM notes').get()).toEqual({
        title: 'Old',
        pinned_at: null,
      })
    } finally {
      sqlite.close()
    }
  })

  it('give notes the documented defaults', () => {
    handle = openDatabase(':memory:')
    const { sqlite } = handle
    sqlite.prepare(`INSERT INTO notes (id, created_at, updated_at) VALUES ('n1', 1, 1)`).run()
    expect(
      sqlite.prepare('SELECT title, body_json, color, remind, check_total FROM notes').get(),
    ).toEqual({ title: '', body_json: '[]', color: 'stone', remind: 'none', check_total: 0 })
  })
})
