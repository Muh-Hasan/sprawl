import { and, eq, isNull } from 'drizzle-orm'
import type { NoteColor } from '@shared/constants'
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
      .select({ item: canvasItems, title: notes.title, color: notes.color })
      .from(canvasItems)
      .leftJoin(notes, and(eq(canvasItems.kind, 'note'), eq(canvasItems.refId, notes.id)))
      .where(isNull(notes.deletedAt))
      .orderBy(canvasItems.z)
      .all()
    return rows.map(({ item, title, color }) =>
      toItem(item, title === null ? undefined : { title, color: color as NoteColor }),
    )
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
        }
      }
    })()
    return { created }
  }

  private create(item: CanvasItemInput, note: NewNote | undefined, now: number): CanvasItem {
    const { db } = this.handle()
    if (note) {
      db.insert(notes)
        .values({
          id: note.id,
          title: note.title,
          color: note.color,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    } else if (item.refId !== null) {
      assertRefExists(this.handle(), item.kind, item.refId)
    }
    const row = db
      .insert(canvasItems)
      .values({ ...item, createdAt: now, updatedAt: now })
      .returning()
      .get()
    const cardNote =
      item.kind === 'note' && item.refId !== null ? this.cardNote(item.refId) : undefined
    return toItem(row, cardNote)
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
    const row = db
      .select({ title: notes.title, color: notes.color })
      .from(notes)
      .where(eq(notes.id, noteId))
      .get()
    return row ? { title: row.title, color: row.color as NoteColor } : undefined
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
