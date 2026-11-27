import { nanoid } from 'nanoid'
import type { NoteColor } from '@shared/constants'
import { dayKey, dayStart, localInstant, shiftDay } from '@shared/due'
import type { LogDay, LogEntry, LogEntryKind, LogEntryPatch, NoteSummary } from '@shared/types'
import type { DbHandle } from '../db/client'

export interface LogDeps {
  /** The open vault's database, or null before onboarding. */
  db: () => DbHandle | null
  now?: () => number
}

interface EntryRow {
  id: string
  day: string
  at: number
  kind: string
  text: string
  note_id: string | null
  created_at: number
  note_title: string | null
  note_color: string | null
}

/**
 * The daily log (ARCHITECTURE §4–5, PRODUCT §3.4): one page per local day, holding the notes
 * marked done that day and the entries written by hand. Only manual entries can be edited.
 */
export class LogService {
  private readonly now: () => number

  constructor(private readonly deps: LogDeps) {
    this.now = deps.now ?? Date.now
  }

  private handle(): DbHandle {
    const handle = this.deps.db()
    if (!handle) throw new Error('No vault is open')
    return handle
  }

  /** A day's entries in time order, done entries with their note's live title and color. */
  day(day: string): LogDay {
    const rows = this.handle()
      .sqlite.prepare(`${ENTRY_SELECT} WHERE e.day = ? ORDER BY e.at, e.created_at`)
      .all(day) as EntryRow[]
    return { day, entries: rows.map(toEntry) }
  }

  /**
   * Adds a manual entry. `at` defaults to now on today, or to the current time of day on another
   * day; a given `at` must fall on `day`.
   */
  addManual(day: string, text: string, at?: number): LogEntry {
    const now = this.now()
    const when = at ?? (day === dayKey(now) ? now : sameTimeOn(day, now))
    if (dayKey(when) !== day) throw new Error(`The entry's time isn't on ${day}`)
    const id = nanoid()
    this.handle()
      .sqlite.prepare(
        `INSERT INTO log_entries (id, day, at, kind, text, note_id, created_at)
         VALUES (?, ?, ?, 'manual', ?, NULL, ?)`,
      )
      .run(id, day, when, text, now)
    return this.get(id)
  }

  /** Edits a manual entry's text or its time (on the same day). */
  update(id: string, patch: LogEntryPatch): LogEntry {
    const { sqlite } = this.handle()
    sqlite.transaction(() => {
      const entry = this.manual(id)
      if (patch.text !== undefined) {
        sqlite.prepare('UPDATE log_entries SET text = ? WHERE id = ?').run(patch.text, id)
      }
      if (patch.time !== undefined) {
        const at = localInstant(entry.day, patch.time)
        sqlite.prepare('UPDATE log_entries SET at = ? WHERE id = ?').run(at, id)
      }
    })()
    return this.get(id)
  }

  /** Deletes a manual entry. Done entries go only by undoing the done. */
  remove(id: string): void {
    const { sqlite } = this.handle()
    sqlite.transaction(() => {
      this.manual(id)
      sqlite.prepare('DELETE FROM log_entries WHERE id = ?').run(id)
    })()
  }

  /** The days of a month (`YYYY-MM`) that have entries, in order. */
  daysWithEntries(month: string): string[] {
    return this.handle()
      .sqlite.prepare("SELECT DISTINCT day FROM log_entries WHERE day LIKE ? || '-%' ORDER BY day")
      .pluck()
      .all(month) as string[]
  }

  /**
   * How many days in a row have entries, ending on `day`. Today counts from yesterday until
   * something is logged, so a streak isn't broken before the day is over.
   */
  streak(day: string): number {
    const days = this.handle()
      .sqlite.prepare('SELECT DISTINCT day FROM log_entries WHERE day <= ? ORDER BY day DESC')
      .pluck()
      .all(day) as string[]
    return countStreak(days, day, day === dayKey(this.now()))
  }

  /**
   * "Carried over" for `day`: the notes edited the day before that weren't done by the end of
   * `day` (so today it's what's still open; on a past day, what was still open then).
   */
  carriedOver(day: string): NoteSummary[] {
    const endOfDay = dayStart(shiftDay(day, 1)).getTime()
    const rows = this.handle()
      .sqlite.prepare(
        `SELECT n.id, n.title, n.color FROM notes n
         JOIN note_activity a ON a.note_id = n.id AND a.day = ?
         WHERE n.deleted_at IS NULL AND (n.done_at IS NULL OR n.done_at >= ?)
         ORDER BY n.updated_at DESC`,
      )
      .all(shiftDay(day, -1), endOfDay) as { id: string; title: string; color: string }[]
    return rows.map((r) => ({ ...r, color: r.color as NoteColor }))
  }

  private get(id: string): LogEntry {
    const row = this.handle().sqlite.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(id) as
      EntryRow | undefined
    if (!row) throw new Error(`No such log entry (${id})`)
    return toEntry(row)
  }

  private manual(id: string): { day: string } {
    const row = this.handle()
      .sqlite.prepare('SELECT day, kind FROM log_entries WHERE id = ?')
      .get(id) as { day: string; kind: string } | undefined
    if (!row) throw new Error(`No such log entry (${id})`)
    if (row.kind !== 'manual') throw new Error(`Only manual entries can be changed (${id})`)
    return row
  }
}

/**
 * The length of the run of consecutive days in `days` (distinct day keys, newest first) that
 * ends on `end`. With `graceToday`, a run ending the day before `end` counts too: `end` is today
 * and nothing has been logged yet.
 */
export function countStreak(days: readonly string[], end: string, graceToday = false): number {
  let expected = end
  if (days[0] !== end) {
    if (!graceToday) return 0
    expected = shiftDay(end, -1)
  }
  let run = 0
  for (let i = 0; i < days.length && days[i] === expected; i++) {
    run++
    expected = shiftDay(expected, -1)
  }
  return run
}

/**
 * Marks a note done or not done (ARCHITECTURE §4). Call it inside a transaction.
 *
 * - Done: sets `done_at` and adds a `done` log entry with a snapshot of the title. A pending
 *   reminder is cancelled by `done_at` itself (the reminder index skips done notes).
 * - Not done: removes that log entry and clears `done_at`. The reminder is armed again only if
 *   it's still ahead: one that came due while the note was done is marked as fired, so undoing
 *   doesn't set off a stale notification.
 *
 * Marking a done note done (or an open note not done) changes nothing. Throws for a missing or
 * deleted note.
 */
export function setNoteDone(
  { sqlite }: DbHandle,
  noteId: string,
  done: boolean,
  now: number,
): void {
  const note = sqlite
    .prepare(
      'SELECT title, done_at, remind_at, reminded_at FROM notes WHERE id = ? AND deleted_at IS NULL',
    )
    .get(noteId) as
    | {
        title: string
        done_at: number | null
        remind_at: number | null
        reminded_at: number | null
      }
    | undefined
  if (!note) throw new Error(`Can't mark a missing note done (${noteId})`)
  if (done === (note.done_at !== null)) return

  if (done) {
    sqlite.prepare('UPDATE notes SET done_at = ? WHERE id = ?').run(now, noteId)
    sqlite
      .prepare(
        `INSERT INTO log_entries (id, day, at, kind, text, note_id, created_at)
         VALUES (?, ?, ?, 'done', ?, ?, ?)`,
      )
      .run(nanoid(), dayKey(now), now, note.title, noteId, now)
    return
  }
  sqlite
    .prepare("DELETE FROM log_entries WHERE note_id = ? AND kind = 'done' AND at = ?")
    .run(noteId, note.done_at)
  const stale = note.remind_at !== null && note.reminded_at === null && note.remind_at <= now
  sqlite
    .prepare('UPDATE notes SET done_at = NULL, reminded_at = ? WHERE id = ?')
    .run(stale ? now : note.reminded_at, noteId)
}

/** The same local time of day as `now`, on `day`. */
function sameTimeOn(day: string, now: number): number {
  const d = new Date(now)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return localInstant(day, `${hh}:${mm}`)
}

const ENTRY_SELECT = `
  SELECT e.id, e.day, e.at, e.kind, e.text, e.note_id, e.created_at,
         n.title AS note_title, n.color AS note_color
  FROM log_entries e
  LEFT JOIN notes n ON n.id = e.note_id AND n.deleted_at IS NULL`

function toEntry(row: EntryRow): LogEntry {
  return {
    id: row.id,
    day: row.day,
    at: row.at,
    kind: row.kind as LogEntryKind,
    text: row.text,
    noteId: row.note_id,
    note:
      row.note_title === null
        ? null
        : { title: row.note_title, color: row.note_color as NoteColor },
    createdAt: row.created_at,
  }
}
