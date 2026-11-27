import { nanoid } from 'nanoid'
import type { CaptureMode } from '@shared/api'
import { dayKey, deriveRemindAt } from '@shared/due'
import { parseCapture, splitCapture } from '@shared/parseCapture'
import type { DbHandle } from '../db/client'
import type { CanvasService } from './canvas'
import type { LogService } from './log'
import { insertNote } from './notes'

export interface CaptureDeps {
  db: () => DbHandle | null
  now: () => number
  canvas: CanvasService
  log: LogService
  /** The world point at the middle of the last canvas view. */
  viewCenter: () => { x: number; y: number }
}

export interface CaptureResult {
  ok: true
  noteId?: string
}

/**
 * Saving a quick capture (PRODUCT §3.7). Note mode: the first line is the title and the rest the
 * body; a `!date` token sets the due date, and with a time also a reminder at that time ("Pay
 * rent !fri 10:00" reminds on Friday at 10:00). The card goes in the middle of the last view, or
 * 40px down and right of a card already there, so captures fan out instead of stacking. Log
 * mode adds the text (its lines joined) to today's log at the current time.
 */
export class CaptureService {
  constructor(private readonly deps: CaptureDeps) {}

  submit(mode: CaptureMode, text: string): CaptureResult {
    if (mode === 'log') {
      const line = text.replace(/\s*\n\s*/g, ' ').trim()
      this.deps.log.addManual(dayKey(this.deps.now()), line)
      return { ok: true }
    }
    const handle = this.deps.db()
    if (!handle) throw new Error('No vault is open')
    const now = this.deps.now()
    const parsed = parseCapture(text, now)
    const { title, body } = splitCapture(parsed.text)
    const id = nanoid()
    const center = this.deps.viewCenter()

    handle.sqlite.transaction(() => {
      insertNote(handle, { id, title, color: 'stone', ...(body ? { body } : {}) }, now)
      if (parsed.due) {
        const due = {
          dueDay: parsed.due.day,
          dueTime: parsed.due.time,
          remind: parsed.due.time === null ? ('none' as const) : ('at' as const),
        }
        handle.sqlite
          .prepare(
            'UPDATE notes SET due_day = ?, due_time = ?, remind = ?, remind_at = ? WHERE id = ?',
          )
          .run(due.dueDay, due.dueTime, due.remind, deriveRemindAt(due), id)
      }
      this.deps.canvas.placeNote(id, center)
    })()
    return { ok: true, noteId: id }
  }
}

/** The world point at the middle of the canvas, from the saved viewport and the canvas size. */
export function viewCenterOf(
  viewport: { x: number; y: number; zoom: number },
  size: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: (size.width / 2 - viewport.x) / viewport.zoom,
    y: (size.height / 2 - viewport.y) / viewport.zoom,
  }
}
