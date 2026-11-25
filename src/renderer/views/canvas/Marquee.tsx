import { cn } from '@/lib/utils'
import { useSelectionStore } from '@/stores/selectionStore'

/**
 * The marquee (UI_SPEC §4.9): a dashed outline with a faint fill, in screen px. While the Note
 * tool draws a note, the same box shows the note's outline with the card radius.
 */
export function Marquee() {
  const rect = useSelectionStore((s) => s.marquee)
  const draft = useSelectionStore((s) => s.marqueeKind === 'draft')
  if (!rect) return null
  return (
    <div
      data-testid={draft ? 'note-draft' : 'marquee'}
      aria-hidden
      className={cn(
        'pointer-events-none absolute border border-dashed',
        draft
          ? 'rounded-card border-note-stone-border bg-note-stone/60'
          : 'border-muted-foreground bg-marquee-fill',
      )}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />
  )
}
