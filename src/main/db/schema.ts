import { sql } from 'drizzle-orm'
import {
  blob,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

/**
 * The full v1 data model (ARCHITECTURE §4). IDs are nanoid text, timestamps are integer ms
 * since epoch (UTC), and day keys are local 'YYYY-MM-DD'.
 *
 * `drizzle-kit generate` turns this file into SQL migrations under ./migrations. The FTS5
 * `search_index` table can't be expressed in Drizzle, so it's appended by hand to 0000_init.sql.
 */

// notes ------------------------------------------------------------------------------------
export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull().default(''),
    bodyJson: text('body_json').notNull().default('[]'),
    bodyText: text('body_text').notNull().default(''),
    color: text('color').notNull().default('stone'),
    dueDay: text('due_day'),
    dueTime: text('due_time'),
    remind: text('remind').notNull().default('none'),
    remindAt: integer('remind_at'),
    remindedAt: integer('reminded_at'),
    doneAt: integer('done_at'),
    checkTotal: integer('check_total').notNull().default(0),
    checkDone: integer('check_done').notNull().default(0),
    attachCount: integer('attach_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (t) => [
    index('notes_remind')
      .on(t.remindAt)
      .where(sql`reminded_at IS NULL AND done_at IS NULL AND deleted_at IS NULL`),
    index('notes_due')
      .on(t.dueDay, t.dueTime)
      .where(sql`done_at IS NULL AND deleted_at IS NULL`),
  ],
)

/** External URLs attached to a note. */
export const noteLinks = sqliteTable('note_links', {
  id: text('id').primaryKey(),
  noteId: text('note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  label: text('label'),
  position: integer('position').notNull(),
})

/** Internal [[links]], derived on save. */
export const refs = sqliteTable(
  'refs',
  {
    fromNoteId: text('from_note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    toKind: text('to_kind').notNull(),
    toId: text('to_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.fromNoteId, t.toKind, t.toId] })],
)

// drawings ---------------------------------------------------------------------------------
export const drawings = sqliteTable('drawings', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default('Untitled drawing'),
  sceneJson: text('scene_json').notNull(),
  thumbPng: blob('thumb_png', { mode: 'buffer' }),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
})

// attachments ------------------------------------------------------------------------------
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  relPath: text('rel_path').notNull(),
  origName: text('orig_name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  sha256: text('sha256').notNull().unique(),
  width: integer('width'),
  height: integer('height'),
  createdAt: integer('created_at').notNull(),
})

// canvas -----------------------------------------------------------------------------------
export const canvasItems = sqliteTable(
  'canvas_items',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    refId: text('ref_id'),
    url: text('url'),
    title: text('title'),
    x: real('x').notNull(),
    y: real('y').notNull(),
    w: real('w').notNull(),
    h: real('h').notNull(),
    z: integer('z').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    // At most one card per note, drawing or attachment.
    uniqueIndex('canvas_items_ref')
      .on(t.kind, t.refId)
      .where(sql`ref_id IS NOT NULL`),
  ],
)

// daily log --------------------------------------------------------------------------------
export const logEntries = sqliteTable(
  'log_entries',
  {
    id: text('id').primaryKey(),
    day: text('day').notNull(),
    at: integer('at').notNull(),
    kind: text('kind').notNull(),
    text: text('text').notNull().default(''),
    noteId: text('note_id').references(() => notes.id, { onDelete: 'set null' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('log_entries_day').on(t.day, t.at)],
)

/** For "carried over": the days each note was edited. */
export const noteActivity = sqliteTable(
  'note_activity',
  {
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.day] })],
)

// misc -------------------------------------------------------------------------------------
/** Vault settings as JSON values (machine settings live in config.json instead). */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
