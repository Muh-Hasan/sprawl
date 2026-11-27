import { Button } from '@/components/ui/button'
import { NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { openNoteResult } from '@/views/search/commands'
import { useRecentNotes } from './useSidebarData'

/**
 * The sidebar's Recent section (UI_SPEC §2): the five open notes edited last. A click opens the
 * note in the panel and, if it has a card on show, glides the canvas to it, as the palette does.
 */
export function RecentNotes() {
  const rows = useRecentNotes()
  const openNoteId = useUiStore((s) => s.openNoteId)
  if (rows.length === 0) return null
  return (
    <section
      aria-label="Recent"
      data-testid="sidebar-recent"
      className="flex flex-col gap-0.5 px-2 pt-5 pb-2"
    >
      <h2 className="px-3 pb-1.5 text-2xs font-medium tracking-[0.02em] text-subtle-foreground">
        Recent
      </h2>
      {rows.map((row) => {
        const open = row.id === openNoteId
        return (
          <Button
            key={row.id}
            variant="ghost"
            data-testid="sidebar-recent-note"
            data-note-id={row.id}
            data-active={open || undefined}
            onClick={() => openNoteResult(row)}
            className="h-8 w-full justify-start gap-3 rounded-lg px-3 text-sm font-normal text-foreground/85 hover:text-foreground data-active:bg-muted data-active:text-foreground dark:data-active:bg-muted"
          >
            <span
              aria-hidden
              className={cn(
                'mx-1 size-2.5 shrink-0 rounded-[3px]',
                NOTE_COLOR_CLASSES[row.color].swatch,
              )}
            />
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-left',
                !row.title && 'text-muted-foreground',
              )}
            >
              {row.title || 'Untitled'}
            </span>
          </Button>
        )
      })}
    </section>
  )
}
