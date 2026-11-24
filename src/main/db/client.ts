import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { MIGRATIONS } from './migrations'
import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema>

export interface DbHandle {
  /** The raw connection, for pragmas, FTS and hand-written SQL. */
  sqlite: Database.Database
  /** The typed Drizzle query layer. */
  db: Db
  close(): void
}

/**
 * Applies every migration newer than the DB's `user_version`, each in its own transaction.
 * Returns how many were applied.
 */
export function migrate(sqlite: Database.Database): number {
  const current = sqlite.pragma('user_version', { simple: true }) as number
  if (current > MIGRATIONS.length) {
    throw new Error(
      `This vault was created by a newer version of Sprawl (schema ${current}, this app knows ${MIGRATIONS.length}).`,
    )
  }
  const pending = MIGRATIONS.slice(current)
  pending.forEach((migration, i) => {
    sqlite.transaction(() => {
      sqlite.exec(migration.sql)
      sqlite.pragma(`user_version = ${current + i + 1}`)
    })()
  })
  return pending.length
}

/**
 * Opens (or creates) a SQLite database with the pragmas from ARCHITECTURE §3 and migrates it.
 * Pass ':memory:' for tests.
 */
export function openDatabase(file: string): DbHandle {
  const sqlite = new Database(file)
  try {
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('synchronous = NORMAL')
    migrate(sqlite)
  } catch (err) {
    sqlite.close()
    throw err
  }
  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
    close: () => sqlite.close(),
  }
}
