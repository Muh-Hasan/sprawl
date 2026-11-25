import { and, eq, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { NoteColor } from '@shared/constants'
import type { NewNote, Note, NotePatch } from '@shared/types'
import type { DbHandle } from '../db/client'
import { textToBody } from '../db/derive'
import { notes } from '../db/schema'

/** Soft-deleted notes and drawings are purged for good this long after deletion. */
export const PURGE_AFTER_MS = 30 * 24 * 60 * 60 * 1000

export interface NotesDeps {
  /** The open vault's database, or null before onboarding. */
  db: () => DbHandle | null
  now?: () => number
}

type NoteRow = typeof notes.$inferSelect

/**
 * Notes (ARCHITECTURE §4–5). The canvas creates, deletes and restores notes together with their
 * cards through `canvas.apply`; these calls are for the panel, the list and quick capture.
 */
export class NotesService {
  private readonly now: () => number

  constructor(private readonly deps: NotesDeps) {
    this.now = deps.now ?? Date.now
  }

  private handle(): DbHandle {
    const handle = this.deps.db()
    if (!handle) throw new Error('No vault is open')
    return handle
  }

  /** The note, deleted or not. Throws if there's no such note. */
  get(id: string): Note {
    const row = this.handle().db.select().from(notes).where(eq(notes.id, id)).get()
    if (!row) throw new Error(`No such note (${id})`)
    return toNote(row)
  }

  create(note: NewNote): Note {
    const handle = this.handle()
    handle.sqlite.transaction(() => insertNote(handle, note, this.now()))()
    return this.get(note.id)
  }

  /** Changes a live note. Throws for a missing or deleted note. */
  update(id: string, patch: NotePatch): Note {
    const { db } = this.handle()
    const row = db
      .update(notes)
      .set({ ...patch, updatedAt: this.now() })
      .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
      .returning()
      .get()
    if (!row) throw new Error(`Can't update a missing note (${id})`)
    return toNote(row)
  }

  /** A new note with a copy of the title, body, color and links, but not the due date or done. */
  duplicate(id: string): Note {
    const source = this.get(id)
    return this.create({ id: nanoid(), title: source.title, color: source.color, copyOf: id })
  }

  remove(id: string): void {
    this.setDeleted(id, this.now())
  }

  restore(id: string): void {
    this.setDeleted(id, null)
  }

  /** Purges notes and drawings deleted more than 30 days ago (run on launch). */
  purge(): PurgeResult {
    return purgeDeleted(this.handle(), this.now())
  }

  private setDeleted(id: string, deletedAt: number | null): void {
    const { db } = this.handle()
    const row = db
      .update(notes)
      .set({ deletedAt, updatedAt: this.now() })
      .where(eq(notes.id, id))
      .returning({ id: notes.id })
      .get()
    if (!row) throw new Error(`No such note (${id})`)
  }
}

/**
 * Inserts a note. Call it inside a transaction: a copy (`copyOf`) also copies the source's
 * links and refs. A pasted `body` becomes one paragraph per line.
 */
export function insertNote(handle: DbHandle, note: NewNote, now: number): void {
  const { sqlite } = handle
  const base = { id: note.id, title: note.title, color: note.color, now }
  if (note.copyOf !== undefined) {
    const copied = sqlite
      .prepare(
        `INSERT INTO notes (id, title, color, body_json, body_text, check_total, check_done,
                            attach_count, created_at, updated_at)
         SELECT @id, @title, @color, body_json, body_text, check_total, check_done,
                attach_count, @now, @now
         FROM notes WHERE id = @copyOf`,
      )
      .run({ ...base, copyOf: note.copyOf })
    if (copied.changes === 0) throw new Error(`Can't copy a missing note (${note.copyOf})`)
    const links = sqlite
      .prepare('SELECT url, label, position FROM note_links WHERE note_id = ? ORDER BY position')
      .all(note.copyOf) as { url: string; label: string | null; position: number }[]
    const insertLink = sqlite.prepare(
      'INSERT INTO note_links (id, note_id, url, label, position) VALUES (?, ?, ?, ?, ?)',
    )
    for (const link of links) insertLink.run(nanoid(), note.id, link.url, link.label, link.position)
    sqlite
      .prepare(
        `INSERT INTO refs (from_note_id, to_kind, to_id)
         SELECT ?, to_kind, to_id FROM refs WHERE from_note_id = ?`,
      )
      .run(note.id, note.copyOf)
    return
  }
  const body = note.body === undefined ? null : textToBody(note.body)
  sqlite
    .prepare(
      `INSERT INTO notes (id, title, color, body_json, body_text, created_at, updated_at)
       VALUES (@id, @title, @color, @bodyJson, @bodyText, @now, @now)`,
    )
    .run({ ...base, bodyJson: body?.bodyJson ?? '[]', bodyText: body?.bodyText ?? '' })
}

export interface PurgeResult {
  notes: number
  drawings: number
}

/**
 * Deletes, for good, the notes and drawings soft-deleted more than 30 days before `now`, in one
 * transaction with their canvas cards, refs and search rows (ARCHITECTURE §4). Links and
 * activity rows go by cascade; log entries keep their title snapshot.
 */
export function purgeDeleted({ sqlite }: DbHandle, now: number): PurgeResult {
  const cutoff = now - PURGE_AFTER_MS
  return sqlite.transaction(() => {
    const purge = (table: 'notes' | 'drawings', kind: 'note' | 'drawing'): number => {
      const doomed = `SELECT id FROM ${table} WHERE deleted_at IS NOT NULL AND deleted_at < @cutoff`
      const args = { cutoff, kind }
      sqlite
        .prepare(`DELETE FROM canvas_items WHERE kind = @kind AND ref_id IN (${doomed})`)
        .run(args)
      sqlite.prepare(`DELETE FROM refs WHERE to_kind = @kind AND to_id IN (${doomed})`).run(args)
      sqlite
        .prepare(`DELETE FROM search_index WHERE kind = @kind AND ref_id IN (${doomed})`)
        .run(args)
      return sqlite
        .prepare(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL AND deleted_at < @cutoff`)
        .run({ cutoff }).changes
    }
    return { notes: purge('notes', 'note'), drawings: purge('drawings', 'drawing') }
  })()
}

export function toNote(row: NoteRow): Note {
  return { ...row, color: row.color as NoteColor }
}
