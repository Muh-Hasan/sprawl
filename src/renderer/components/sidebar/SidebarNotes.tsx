import type { NoteListRow } from '@shared/types'
import { Button } from '@/components/ui/button'
import { NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { openNoteResult } from '@/views/search/commands'
import { usePinnedNotes, useRecentNotes } from './useSidebarData'

/**
 * A list of notes in the sidebar (UI_SPEC §2): a heading, then one 32px row per note with its
 * color swatch and title. A click opens the note in the panel and, if it has a card on show,
 * glides the canvas to it, as the palette does. Nothing shows while the list is empty.
 */
function NoteSection({
  label,
  id,
  rows,
}: {
  label: string
  /** `pinned` or `recent`, for the test ids. */
  id: string
  rows: readonly NoteListRow[]
}) {
  const openNoteId = useUiStore((s) => s.openNoteId)
  if (rows.length === 0) return null
  return (
    <section
      aria-label={label}
      data-testid={`sidebar-${id}`}
      className="flex flex-col gap-0.5 px-2 pt-5 pb-2 [&+&]:pt-1.5"
    >
      <h2 className="px-3 pb-1.5 text-2xs font-medium tracking-[0.02em] text-subtle-foreground">
        {label}
      </h2>
      {rows.map((row) => {
        const open = row.id === openNoteId
        const done = row.doneAt !== null
        return (
          <Button
            key={row.id}
            variant="ghost"
            data-testid={`sidebar-${id}-note`}
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
                (!row.title || done) && 'text-muted-foreground',
                done && 'line-through',
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

/** The notes pinned from a note menu, in the order they were pinned. */
export function PinnedNotes() {
  return <NoteSection label="Pinned" id="pinned" rows={usePinnedNotes()} />
}

/** The five open notes edited last that aren't pinned. */
export function RecentNotes() {
  return <NoteSection label="Recent" id="recent" rows={useRecentNotes()} />
}
