import type { NoteColor } from '@shared/constants'
import { dayKey, dueState } from '@shared/due'
import type { NoteCountQuery, NoteListCounts, NoteListQuery, NoteListRow } from '@shared/types'
import type { DbHandle } from '../db/client'

/**
 * The List view's query (PRODUCT §3.3): every live note, filtered by tab, color and title, in
 * the chosen order. The builder is pure, so each filter and sort is unit-tested on its own SQL
 * as well as through a real database.
 */

export interface BuiltQuery {
  sql: string
  params: Record<string, string | number>
}

/** How much of the body the row needs to find its first line. */
const FIRST_LINE_SCAN = 400
const FIRST_LINE_MAX = 200

const TAB_WHERE: Record<NoteListQuery['tab'], string | null> = {
  open: 'n.done_at IS NULL',
  due: 'n.done_at IS NULL AND n.due_day IS NOT NULL',
  done: 'n.done_at IS NOT NULL',
  all: null,
}

/** Soonest first: by day, then a time before "sometime that day". */
const BY_DUE = 'n.due_day IS NULL, n.due_day, n.due_time IS NULL, n.due_time'

const SORT_ORDER: Record<NoteListQuery['sort'], string> = {
  edited: 'n.updated_at DESC',
  created: 'n.created_at DESC',
  // Untitled notes go last, not first.
  title: "n.title = '', n.title COLLATE NOCASE",
  due: `${BY_DUE}, n.updated_at DESC`,
}

/** `LIKE` treats % and _ as wildcards; a typed one should match itself. */
function likeEscape(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/** The color and title filter every tab shares, over live notes. */
function filterWhere(q: NoteCountQuery): { where: string[]; params: BuiltQuery['params'] } {
  const where = ['n.deleted_at IS NULL']
  const params: BuiltQuery['params'] = {}
  if (q.colors.length > 0) {
    const names = q.colors.map((color, i) => {
      params[`color${i}`] = color
      return `@color${i}`
    })
    where.push(`n.color IN (${names.join(', ')})`)
  }
  const text = q.text.trim()
  if (text !== '') {
    params['text'] = `%${likeEscape(text)}%`
    where.push(`n.title LIKE @text ESCAPE '\\'`)
  }
  return { where, params }
}

export function buildNoteListQuery(q: NoteListQuery): BuiltQuery {
  const { where, params } = filterWhere(q)
  const tab = TAB_WHERE[q.tab]
  if (tab) where.push(tab)
  // Due always sorts by due date and Done by when; the sort select is for Open and All.
  const order =
    q.tab === 'due'
      ? `${BY_DUE}, n.updated_at DESC`
      : q.tab === 'done'
        ? 'n.done_at DESC'
        : SORT_ORDER[q.sort]
  const sql = `
    SELECT ${ROW_COLUMNS}
    FROM notes n
    WHERE ${where.join(' AND ')}
    ORDER BY ${order}, n.rowid DESC`
  return { sql, params }
}

/** What a row shows, from `notes n`. */
const ROW_COLUMNS = `
  n.id, n.title, n.color, substr(n.body_text, 1, ${FIRST_LINE_SCAN}) AS body_start,
  n.check_total, n.check_done,
  (SELECT count(*) FROM note_links l WHERE l.note_id = n.id) AS link_count,
  n.due_day, n.due_time, n.done_at, n.pinned_at, n.created_at, n.updated_at,
  EXISTS (SELECT 1 FROM canvas_items c WHERE c.kind = 'note' AND c.ref_id = n.id) AS on_canvas`

interface ListRow {
  id: string
  title: string
  color: string
  body_start: string
  check_total: number
  check_done: number
  link_count: number
  due_day: string | null
  due_time: string | null
  done_at: number | null
  pinned_at: number | null
  created_at: number
  updated_at: number
  on_canvas: number
}

/** The first non-empty line of a body's text. */
export function firstLineOf(text: string): string {
  const line = text.split('\n').find((l) => l.trim() !== '') ?? ''
  return line.trim().slice(0, FIRST_LINE_MAX)
}

function toRow(r: ListRow): NoteListRow {
  return {
    id: r.id,
    title: r.title,
    color: r.color as NoteColor,
    firstLine: firstLineOf(r.body_start),
    checkTotal: r.check_total,
    checkDone: r.check_done,
    linkCount: r.link_count,
    dueDay: r.due_day,
    dueTime: r.due_time,
    doneAt: r.done_at,
    pinnedAt: r.pinned_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    onCanvas: r.on_canvas === 1,
  }
}

export function listNotes({ sqlite }: DbHandle, q: NoteListQuery): NoteListRow[] {
  const { sql, params } = buildNoteListQuery(q)
  return (sqlite.prepare(sql).all(params) as ListRow[]).map(toRow)
}

/** The tab counts in one pass: how many rows each tab would list for these filters. */
export function buildNoteCountQuery(q: NoteCountQuery): BuiltQuery {
  const { where, params } = filterWhere(q)
  const count = (tab: 'open' | 'due' | 'done'): string => `coalesce(sum(${TAB_WHERE[tab]}), 0)`
  const sql = `
    SELECT ${count('open')} AS open, ${count('due')} AS due, ${count('done')} AS done,
      count(*) AS "all"
    FROM notes n
    WHERE ${where.join(' AND ')}`
  return { sql, params }
}

/** How many notes each List tab holds for a color and title filter. */
export function countNotes({ sqlite }: DbHandle, q: NoteCountQuery): NoteListCounts {
  const { sql, params } = buildNoteCountQuery(q)
  return sqlite.prepare(sql).get(params) as NoteListCounts
}

/** The sidebar's Pinned section: every live pinned note, done or not, in the order pinned. */
export function listPinned({ sqlite }: DbHandle): NoteListRow[] {
  const rows = sqlite
    .prepare(
      `SELECT ${ROW_COLUMNS}
       FROM notes n
       WHERE n.pinned_at IS NOT NULL AND n.deleted_at IS NULL
       ORDER BY n.pinned_at, n.rowid`,
    )
    .all() as ListRow[]
  return rows.map(toRow)
}

/** How many open notes are past their due time (or past the end of a day without one). */
export function countOverdue({ sqlite }: DbHandle, now: number): number {
  const rows = sqlite
    .prepare(
      `SELECT due_day, due_time FROM notes
       WHERE deleted_at IS NULL AND done_at IS NULL AND due_day IS NOT NULL AND due_day <= ?`,
    )
    .all(dayKey(now)) as { due_day: string; due_time: string | null }[]
  return rows.filter((r) => dueState(r.due_day, r.due_time, now) === 'overdue').length
}
