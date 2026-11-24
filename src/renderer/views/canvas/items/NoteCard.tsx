import { memo } from 'react'
import type { CanvasItem } from '@shared/types'
import { NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { cn } from '@/lib/utils'

interface NoteCardProps {
  item: CanvasItem
  /** Below 40% zoom: the title only, with no shadow, to stay fast (UI_SPEC §4.5). */
  simplified: boolean
}

/**
 * A sticky note card (UI_SPEC §4.5). later: phase-3 adds the preview, hover, selection and
 * inline title editing; phase-4 onwards the chips.
 */
export const NoteCard = memo(function NoteCard({ item, simplified }: NoteCardProps) {
  const colors = NOTE_COLOR_CLASSES[item.note?.color ?? 'stone']
  const title = item.note?.title ?? ''
  return (
    <div
      data-testid="note-card"
      data-id={item.id}
      data-simplified={simplified || undefined}
      className={cn(
        'absolute overflow-hidden rounded-card border',
        colors.bg,
        colors.border,
        colors.text,
        'px-3.5 py-3',
        // Shadows are the costliest part of a card to paint, and invisible when zoomed out.
        !simplified && 'shadow-(--shadow-card)',
      )}
      style={{ left: item.x, top: item.y, width: item.w, height: item.h, zIndex: item.z }}
    >
      <p className={cn('line-clamp-2 text-card-title break-words', !title && 'opacity-60')}>
        {title || 'Untitled'}
      </p>
    </div>
  )
})
