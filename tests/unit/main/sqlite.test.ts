import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'

// Proves the native module loads in the unit-test runtime. better-sqlite3 ships an N-API
// prebuild, so the same binary also loads in Electron (no rebuild step; ARCHITECTURE §10.2).
describe('better-sqlite3', () => {
  it('opens an in-memory database with FTS5 available', () => {
    const db = new Database(':memory:')
    try {
      db.exec('CREATE VIRTUAL TABLE t USING fts5(body)')
      db.prepare('INSERT INTO t (body) VALUES (?)').run('hello sprawl')
      const row = db.prepare("SELECT body FROM t WHERE t MATCH 'sprawl'").get() as { body: string }
      expect(row.body).toBe('hello sprawl')
    } finally {
      db.close()
    }
  })
})
