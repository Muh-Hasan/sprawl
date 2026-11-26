import { and, eq, isNull, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { NOTE_CARD, PREVIEW_CHARS, SNAP_GRID, type NoteColor } from '@shared/constants'
import type {
  CanvasApplyResult,
  CanvasItem,
  CanvasItemInput,
  CanvasItemKind,
  CanvasItemPatch,
  CanvasOp,
  NewNote,
} from '@shared/types'
import type { DbHandle } from '../db/client'
import { canvasItems, drawings, notes } from '../db/schema'
import { setNoteDone } from './log'
import { insertNote } from './notes'

export interface CanvasDeps {
  /** The open vault's database, or null before onboarding. */
  db: () => DbHandle | null
  now?: () => number
}

type ItemRow = typeof canvasItems.$inferSelect

/**
 * The canvas (ARCHITECTURE §5): cards and their batched ops. Every `apply` is one
 * transaction, so a note and its card are always created and deleted together.
 */
export class CanvasService {
  private readonly now: () => number

  constructor(private readonly deps: CanvasDeps) {
    this.now = deps.now ?? Date.now
  }

  private handle(): DbHandle {
    const handle = this.deps.db()
    if (!handle) throw new Error('No vault is open')
    return handle
  }

  /** Every card, with its note's card fields for note cards. Cards of deleted notes are skipped. */
  load(): CanvasItem[] {
    const { db } = this.handle()
    const rows = db
      .select({ item: canvasItems, ...CARD_NOTE_FIELDS })
      .from(canvasItems)
      .leftJoin(notes, and(eq(canvasItems.kind, 'note'), eq(canvasItems.refId, notes.id)))
      .where(isNull(notes.deletedAt))
      .orderBy(canvasItems.z)
      .all()
    return rows.map(({ item, ...note }) => toItem(item, toCardNote(note)))
  }

  /** The card of a note, or null if it isn't on the canvas. */
  cardOf(noteId: string): CanvasItem | null {
    const { db } = this.handle()
    const row = db
      .select()
      .from(canvasItems)
      .where(and(eq(canvasItems.kind, 'note'), eq(canvasItems.refId, noteId)))
      .get()
    return row ? toItem(row, this.cardNote(noteId)) : null
  }

  /**
   * Gives a live note a card of the default size, centered on `center` (world, snapped to the
   * grid) and on top of the others. A note that already has a card keeps it, where it is.
   */
  placeNote(noteId: string, center: { x: number; y: number }): CanvasItem {
    const handle = this.handle()
    return handle.sqlite.transaction(() => {
      const existing = this.cardOf(noteId)
      if (existing) return existing
      assertRefExists(handle, 'note', noteId)
      const top = handle.sqlite.prepare('SELECT max(z) FROM canvas_items').pluck().get() as
        number | null
      const snap = (v: number): number => Math.round(v / SNAP_GRID) * SNAP_GRID
      return this.insertItem(
        {
          id: nanoid(),
          kind: 'note',
          refId: noteId,
          url: null,
          title: null,
          x: snap(center.x - NOTE_CARD.w / 2),
          y: snap(center.y - NOTE_CARD.h / 2),
          w: NOTE_CARD.w,
          h: NOTE_CARD.h,
          z: (top ?? -1) + 1,
        },
        this.now(),
      )
    })()
  }

  apply(ops: readonly CanvasOp[]): CanvasApplyResult {
    const { sqlite } = this.handle()
    const created: CanvasItem[] = []
    sqlite.transaction(() => {
      const now = this.now()
      for (const op of ops) {
        switch (op.op) {
          case 'create':
            created.push(this.create(op.item, op.note, now))
            break
          case 'update':
            this.update(op.id, op.patch, now)
            break
          case 'delete':
            this.remove(op.id, now)
            break
          case 'restore':
            created.push(this.restore(op.item, now))
            break
          case 'setColor':
            this.setColor(op.id, op.color, now)
            break
          case 'setDone':
            this.setDone(op.id, op.done, now)
            break
        }
      }
    })()
    return { created }
  }

  private create(item: CanvasItemInput, note: NewNote | undefined, now: number): CanvasItem {
    const handle = this.handle()
    if (note) insertNote(handle, note, now)
    else if (item.refId !== null) assertRefExists(handle, item.kind, item.refId)
    return this.insertItem(item, now)
  }

  /** Puts a deleted card back with its old id, and un-deletes its note or drawing. */
  private restore(item: CanvasItemInput, now: number): CanvasItem {
    const { db } = this.handle()
    if (item.refId !== null && (item.kind === 'note' || item.kind === 'drawing')) {
      const table = item.kind === 'note' ? notes : drawings
      const row = db
        .update(table)
        .set({ deletedAt: null, updatedAt: now })
        .where(eq(table.id, item.refId))
        .returning({ id: table.id })
        .get()
      if (!row) throw new Error(`Can't restore a card for a purged ${item.kind} (${item.refId})`)
    } else if (item.refId !== null) {
      assertRefExists(this.handle(), item.kind, item.refId)
    }
    return this.insertItem(item, now)
  }

  private insertItem(item: CanvasItemInput, now: number): CanvasItem {
    const { db } = this.handle()
    const row = db
      .insert(canvasItems)
      .values({ ...item, createdAt: now, updatedAt: now })
      .returning()
      .get()
    const cardNote =
      item.kind === 'note' && item.refId !== null ? this.cardNote(item.refId) : undefined
    return toItem(row, cardNote)
  }

  /** Sets a note card's note color. A card that's gone is a no-op; any other kind fails. */
  private setColor(id: string, color: NoteColor, now: number): void {
    const { db } = this.handle()
    const card = db.select().from(canvasItems).where(eq(canvasItems.id, id)).get()
    if (!card) return
    if (card.kind !== 'note' || card.refId === null) {
      throw new Error(`Only note cards have a color (${id} is a ${card.kind} card)`)
    }
    db.update(notes).set({ color, updatedAt: now }).where(eq(notes.id, card.refId)).run()
  }

  /** Marks a note card's note done or not. A card that's gone is a no-op; any other kind fails. */
  private setDone(id: string, done: boolean, now: number): void {
    const handle = this.handle()
    const card = handle.db.select().from(canvasItems).where(eq(canvasItems.id, id)).get()
    if (!card) return
    if (card.kind !== 'note' || card.refId === null) {
      throw new Error(`Only note cards can be done (${id} is a ${card.kind} card)`)
    }
    setNoteDone(handle, card.refId, done, now)
  }

  /** Updating a card that no longer exists is a no-op (it lost a race with a delete). */
  private update(id: string, patch: CanvasItemPatch, now: number): void {
    const { db } = this.handle()
    db.update(canvasItems)
      .set({ ...patch, updatedAt: now })
      .where(eq(canvasItems.id, id))
      .run()
  }

  /** Removes the card; a note or drawing card also soft-deletes its note or drawing. */
  private remove(id: string, now: number): void {
    const { db } = this.handle()
    const row = db.delete(canvasItems).where(eq(canvasItems.id, id)).returning().get()
    if (!row?.refId) return
    if (row.kind === 'note') {
      db.update(notes).set({ deletedAt: now, updatedAt: now }).where(eq(notes.id, row.refId)).run()
    } else if (row.kind === 'drawing') {
      db.update(drawings)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(drawings.id, row.refId))
        .run()
    }
  }

  private cardNote(noteId: string): CanvasItem['note'] {
    const { db } = this.handle()
    const row = db.select(CARD_NOTE_FIELDS).from(notes).where(eq(notes.id, noteId)).get()
    return row ? toCardNote(row) : undefined
  }
}

/** The note columns a card shows (UI_SPEC §4.5). */
const CARD_NOTE_FIELDS = {
  title: notes.title,
  color: notes.color,
  preview: sql<string | null>`substr(${notes.bodyText}, 1, ${PREVIEW_CHARS})`,
  checkTotal: notes.checkTotal,
  checkDone: notes.checkDone,
  attachCount: notes.attachCount,
  linkCount: sql<
    number | null
  >`(SELECT count(*) FROM note_links WHERE note_links.note_id = ${notes.id})`,
  dueDay: notes.dueDay,
  dueTime: notes.dueTime,
  doneAt: notes.doneAt,
}

interface CardNoteRow {
  title: string | null
  color: string | null
  preview: string | null
  checkTotal: number | null
  checkDone: number | null
  attachCount: number | null
  linkCount: number | null
  dueDay: string | null
  dueTime: string | null
  doneAt: number | null
}

/** A left join gives nulls for a card that isn't a note's. */
function toCardNote(row: CardNoteRow): CanvasItem['note'] {
  if (row.title === null) return undefined
  return {
    title: row.title,
    color: row.color as NoteColor,
    preview: row.preview ?? '',
    checkTotal: row.checkTotal ?? 0,
    checkDone: row.checkDone ?? 0,
    attachCount: row.attachCount ?? 0,
    linkCount: row.linkCount ?? 0,
    dueDay: row.dueDay,
    dueTime: row.dueTime,
    doneAt: row.doneAt,
  }
}

/** The live row a card of each kind points at (notes and drawings mustn't be deleted). */
const REF_EXISTS: Record<Exclude<CanvasItemKind, 'link'>, string> = {
  note: 'SELECT 1 FROM notes WHERE id = ? AND deleted_at IS NULL',
  drawing: 'SELECT 1 FROM drawings WHERE id = ? AND deleted_at IS NULL',
  image: 'SELECT 1 FROM attachments WHERE id = ?',
}

function assertRefExists(handle: DbHandle, kind: CanvasItemKind, refId: string): void {
  if (kind === 'link') return
  if (handle.sqlite.prepare(REF_EXISTS[kind]).get(refId) === undefined) {
    throw new Error(`Can't place a card for a missing ${kind} (${refId})`)
  }
}

function toItem(row: ItemRow, note: CanvasItem['note']): CanvasItem {
  return {
    id: row.id,
    kind: row.kind as CanvasItemKind,
    refId: row.refId,
    url: row.url,
    title: row.title,
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
    z: row.z,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(note ? { note } : {}),
  }
}
