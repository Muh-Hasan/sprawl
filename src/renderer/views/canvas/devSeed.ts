import { nanoid } from 'nanoid'
import { NOTE_COLORS } from '@shared/constants'
import type { CanvasOp } from '@shared/types'
import type { Shortcut } from '@/lib/shortcuts'
import { useCanvasStore } from '@/stores/canvasStore'
import { screenToWorld } from './Viewport'

/** Dev only (`import.meta.env.DEV`): Ctrl+Alt+Shift+S seeds placeholder cards for perf tests. */
export const SEED_SHORTCUT: Shortcut = { codes: ['KeyS'], ctrl: true, alt: true, shift: true }

const COLS = 40
const CARD = { w: 220, h: 96 }
const GAP = { x: 40, y: 32 }

/**
 * Places `count` placeholder notes in a grid centered on the view, each with its own note,
 * in one `canvas.apply` batch.
 */
export function seedCards(count = 1000): void {
  const { viewport, size, items, apply } = useCanvasStore.getState()
  const rows = Math.ceil(count / COLS)
  const center = screenToWorld(viewport, { x: size.width / 2, y: size.height / 2 })
  const left = center.x - (COLS * (CARD.w + GAP.x)) / 2
  const top = center.y - (rows * (CARD.h + GAP.y)) / 2
  let z = Math.max(0, ...[...items.values()].map((i) => i.z)) + 1
  const ops: CanvasOp[] = []
  for (let i = 0; i < count; i++) {
    const noteId = nanoid()
    ops.push({
      op: 'create',
      item: {
        id: nanoid(),
        kind: 'note',
        refId: noteId,
        url: null,
        title: null,
        x: left + (i % COLS) * (CARD.w + GAP.x),
        y: top + Math.floor(i / COLS) * (CARD.h + GAP.y),
        ...CARD,
        z: z++,
      },
      note: {
        id: noteId,
        title: `Placeholder card ${i + 1}`,
        color: NOTE_COLORS[i % NOTE_COLORS.length]!,
      },
    })
  }
  apply(ops)
}
