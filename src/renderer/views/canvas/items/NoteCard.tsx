import { memo, useEffect, useRef, useState } from 'react'
import { IconArrowsDiagonal, IconCheck } from '@tabler/icons-react'
import { HintTooltip } from '@/components/HintTooltip'
import type { CanvasItem } from '@shared/types'
import { NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { CANVAS_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { takeFresh } from '../fresh'
import { openSelectedNote, setCardsDone } from '../actions'
import { observeCard } from '../measure'
import { NOTE_SIZE } from '../ops'
import { CardBody } from './CardBody'
import { CardChips } from './CardChips'
import { CardTitle } from './CardTitle'
import { ResizeHandles } from './ResizeHandles'

interface NoteCardProps {
  item: CanvasItem
  /** Below 40% zoom: the title only, with no shadow, to stay fast (UI_SPEC §4.5). */
  simplified: boolean
}

/** A 20px ghost button at the card's top-right that fades in on hover (UI_SPEC §4.5). */
const CARD_BUTTON =
  'absolute top-2 flex size-5 items-center justify-center rounded-md opacity-0 transition-opacity duration-120 group-hover/card:opacity-70 hover:bg-note-chip hover:opacity-100! focus-visible:opacity-100'

/** Opens the note in the side panel. */
function OpenButton({ itemId }: { itemId: string }) {
  return (
    <HintTooltip label="Open" shortcut="Enter">
      <button
        type="button"
        data-card-action
        data-testid="note-card-open"
        aria-label="Open"
        onClick={() => {
          useSelectionStore.getState().select([itemId])
          openSelectedNote()
        }}
        className={cn(CARD_BUTTON, 'right-2')}
      >
        <IconArrowsDiagonal className="size-3.5" stroke={2} aria-hidden />
      </button>
    </HintTooltip>
  )
}

/** One-click Mark done, left of the open button; on a done card (Show done) it undoes it. */
function DoneButton({ itemId, done }: { itemId: string; done: boolean }) {
  const label = done ? 'Mark not done' : 'Mark done'
  return (
    <HintTooltip label={label} shortcut={shortcutLabel(CANVAS_SHORTCUTS.markDone)}>
      <button
        type="button"
        data-card-action
        data-testid="note-card-done"
        aria-label={label}
        aria-pressed={done}
        onClick={() => setCardsDone([itemId], !done)}
        className={cn(CARD_BUTTON, 'right-[30px]', done && 'opacity-70')}
      >
        <IconCheck className="size-3.5" stroke={2} aria-hidden />
      </button>
    </HintTooltip>
  )
}

/** The selection outline (DESIGN_SYSTEM §8), kept 1.5px on screen at any zoom. */
const SELECTED =
  '[outline:calc(1.5px*var(--inv-zoom,1))_solid_var(--selection)] [outline-offset:calc(2px*var(--inv-zoom,1))]'

/**
 * A sticky note card (UI_SPEC §4.5): title, a plain-text preview and the note's color. Its
 * height grows with the content, from the stored `h` up to the max. While a move or resize runs,
 * its rect comes from the selection store's transient rects. Under the preview is the chips row
 * (checklist, links, attachments, due). Marked done, it fades out (or, with "Show done", stays
 * faded with its title struck through).
 */
export const NoteCard = memo(function NoteCard({ item, simplified }: NoteCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const selected = useSelectionStore((s) => s.selected.has(item.id))
  const alone = useSelectionStore((s) => s.selected.size === 1)
  const editing = useSelectionStore((s) => s.editing === item.id)
  const writing = useSelectionStore((s) => s.bodyEditing === item.id)
  const transient = useSelectionStore((s) => s.transient?.get(item.id))
  const dragging = useSelectionStore((s) => s.gesture === 'move' && selected)
  const [fresh] = useState(() => takeFresh(item.id))
  const leaving = useCanvasStore((s) => s.leaving.has(item.id))
  const done = item.note?.doneAt != null

  useEffect(() => (ref.current ? observeCard(ref.current) : undefined), [])

  const colors = NOTE_COLOR_CLASSES[item.note?.color ?? 'stone']
  const title = item.note?.title ?? ''
  const preview = item.note?.preview ?? ''
  const rect = transient ?? item

  return (
    <div
      ref={ref}
      data-testid="note-card"
      data-card-id={item.id}
      data-selected={selected || undefined}
      data-dragging={dragging || undefined}
      data-writing={writing || undefined}
      data-simplified={simplified || undefined}
      data-done={done || undefined}
      data-leaving={leaving || undefined}
      className={cn(
        'group/card absolute flex flex-col overflow-visible rounded-card border px-3.5 py-3',
        'transition-[box-shadow,border-color,scale,opacity] duration-120 ease-(--ease-out)',
        colors.bg,
        colors.border,
        colors.text,
        // Shadows are the costliest part of a card to paint, and invisible when zoomed out.
        !simplified && 'shadow-(--shadow-card)',
        !simplified && colors.hoverBorder,
        !simplified && 'hover:shadow-(--shadow-lift)',
        dragging && 'scale-[1.02] opacity-95 shadow-(--shadow-lift) motion-reduce:scale-100',
        selected && SELECTED,
        // A new card fades in. Opacity only: a scale-in changes where the card is hit-tested
        // while it runs (and it stalls in a window that isn't painting), so a quick grab misses.
        fresh && 'animate-in fade-in-0 ease-(--ease-out) [animation-duration:150ms]',
        done && !leaving && 'opacity-50',
        // Mark done (DESIGN_SYSTEM §6): fade to 0 and shrink to 0.96 over 180ms, then hide.
        leaving &&
          'pointer-events-none scale-[0.96] opacity-0 duration-180 ease-(--ease-in) motion-reduce:scale-100',
      )}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        minHeight: rect.h,
        maxHeight: NOTE_SIZE.maxH,
        zIndex: item.z,
      }}
    >
      <div className="flex min-h-0 flex-col overflow-hidden">
        <CardTitle itemId={item.id} title={title} editing={editing} done={done} />
        {writing && item.refId !== null ? (
          <CardBody itemId={item.id} noteId={item.refId} />
        ) : (
          !simplified &&
          preview && (
            <p
              data-testid="note-card-preview"
              className="mt-2 line-clamp-4 text-xs break-words whitespace-pre-line opacity-70"
            >
              {preview}
            </p>
          )
        )}
        {!simplified && item.note && <CardChips note={item.note} />}
      </div>
      {!simplified && <DoneButton itemId={item.id} done={done} />}
      {!simplified && <OpenButton itemId={item.id} />}
      {selected && alone && <ResizeHandles />}
    </div>
  )
})
