import { and, asc, eq, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { NoteColor, RemindOption } from '@shared/constants'
import { dayKey, deriveRemindAt, normalizeDue } from '@shared/due'
import type { NewNote, Note, NoteLink, NoteLinkPatch, NotePatch } from '@shared/types'
import type { DbHandle } from '../db/client'
import { deriveBody, textToBody } from '../db/derive'
import { noteLinks, notes } from '../db/schema'
import { setNoteDone } from './log'

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

  /** The note, deleted or not, with its links. Throws if there's no such note. */
  get(id: string): Note {
    const { db } = this.handle()
    const row = db.select().from(notes).where(eq(notes.id, id)).get()
    if (!row) throw new Error(`No such note (${id})`)
    const links = db
      .select()
      .from(noteLinks)
      .where(eq(noteLinks.noteId, id))
      .orderBy(asc(noteLinks.position))
      .all()
    return toNote(row, links)
  }

  create(note: NewNote): Note {
    const handle = this.handle()
    handle.sqlite.transaction(() => insertNote(handle, note, this.now()))()
    return this.get(note.id)
  }

  /**
   * Changes a live note, in one transaction with what's derived from it (ARCHITECTURE §4): a
   * new body gives the plain text and counts, and new due fields give `remind_at` (a changed
   * due date or reminder arms it again). Every save marks the note active today. Throws for a
   * missing or deleted note.
   */
  update(id: string, patch: NotePatch): Note {
    const { sqlite, db } = this.handle()
    sqlite.transaction(() => {
      const now = this.now()
      const current = this.liveRow(id)
      const set: Partial<NoteRow> = { updatedAt: now }
      if (patch.title !== undefined) set.title = patch.title
      if (patch.color !== undefined) set.color = patch.color
      if (patch.bodyJson !== undefined) {
        set.bodyJson = patch.bodyJson
        Object.assign(set, deriveBody(JSON.parse(patch.bodyJson) as unknown[]))
      }
      if ('dueDay' in patch || 'dueTime' in patch || patch.remind !== undefined) {
        const before = {
          dueDay: current.dueDay,
          dueTime: current.dueTime,
          remind: current.remind as RemindOption,
        }
        const due = normalizeDue({
          dueDay: patch.dueDay === undefined ? before.dueDay : patch.dueDay,
          dueTime: patch.dueTime === undefined ? before.dueTime : patch.dueTime,
          remind: patch.remind ?? before.remind,
        })
        const changed =
          due.dueDay !== before.dueDay ||
          due.dueTime !== before.dueTime ||
          due.remind !== before.remind
        if (changed) {
          Object.assign(set, due, { remindAt: deriveRemindAt(due), remindedAt: null })
        }
      }
      db.update(notes).set(set).where(eq(notes.id, id)).run()
      this.touchActivity(id, now)
    })()
    return this.get(id)
  }

  // links ------------------------------------------------------------------------------------

  /** Adds a link at the end of a live note's list. */
  addLink(noteId: string, url: string, label: string | null): NoteLink {
    const { sqlite, db } = this.handle()
    return sqlite.transaction(() => {
      this.liveRow(noteId)
      const last = sqlite
        .prepare('SELECT max(position) FROM note_links WHERE note_id = ?')
        .pluck()
        .get(noteId) as number | null
      const link = { id: nanoid(), noteId, url, label, position: (last ?? -1) + 1 }
      db.insert(noteLinks).values(link).run()
      this.touch(noteId)
      return link
    })()
  }

  updateLink(id: string, patch: NoteLinkPatch): NoteLink {
    const { sqlite, db } = this.handle()
    return sqlite.transaction(() => {
      const row = db.update(noteLinks).set(patch).where(eq(noteLinks.id, id)).returning().get()
      if (!row) throw new Error(`No such link (${id})`)
      this.touch(row.noteId)
      return row
    })()
  }

  removeLink(id: string): void {
    const { sqlite, db } = this.handle()
    sqlite.transaction(() => {
      const row = db.delete(noteLinks).where(eq(noteLinks.id, id)).returning().get()
      if (row) this.touch(row.noteId)
    })()
  }

  /** Puts a note's links in the given order. `ids` must be exactly the note's links. */
  reorderLinks(noteId: string, ids: readonly string[]): NoteLink[] {
    const { sqlite, db } = this.handle()
    sqlite.transaction(() => {
      const existing = db
        .select({ id: noteLinks.id })
        .from(noteLinks)
        .where(eq(noteLinks.noteId, noteId))
        .all()
        .map((r) => r.id)
      const same = existing.length === ids.length && ids.every((id) => existing.includes(id))
      if (!same) throw new Error(`The new order must list every link of the note (${noteId})`)
      const setPosition = sqlite.prepare('UPDATE note_links SET position = ? WHERE id = ?')
      ids.forEach((id, position) => setPosition.run(position, id))
      this.touch(noteId)
    })()
    return this.get(noteId).links
  }

  // helpers ----------------------------------------------------------------------------------

  private liveRow(id: string): NoteRow {
    const { db } = this.handle()
    const row = db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
      .get()
    if (!row) throw new Error(`Can't update a missing note (${id})`)
    return row
  }

  /** A change to a note's links counts as an edit of the note. */
  private touch(noteId: string): void {
    const now = this.now()
    this.handle().db.update(notes).set({ updatedAt: now }).where(eq(notes.id, noteId)).run()
    this.touchActivity(noteId, now)
  }

  /** Marks the note as worked on today (for "carried over" in the daily log). */
  private touchActivity(noteId: string, now: number): void {
    this.handle()
      .sqlite.prepare('INSERT OR IGNORE INTO note_activity (note_id, day) VALUES (?, ?)')
      .run(noteId, dayKey(now))
  }

  /** A new note with a copy of the title, body, color and links, but not the due date or done. */
  duplicate(id: string): Note {
    const source = this.get(id)
    return this.create({ id: nanoid(), title: source.title, color: source.color, copyOf: id })
  }

  /**
   * Marks a note done (adding its log entry) or not done (removing it), in one transaction
   * (ARCHITECTURE §4). On the canvas this goes through the undoable `setDone` op instead.
   */
  setDone(id: string, done: boolean): Note {
    const handle = this.handle()
    handle.sqlite.transaction(() => setNoteDone(handle, id, done, this.now()))()
    return this.get(id)
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

type LinkRow = typeof noteLinks.$inferSelect

export function toNote(row: NoteRow, links: LinkRow[]): Note {
  return {
    ...row,
    color: row.color as NoteColor,
    remind: row.remind as RemindOption,
    links: links.map((l) => ({ ...l })),
  }
}
