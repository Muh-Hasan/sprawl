import type { NoteSummary } from '@shared/types'
import { Button } from '@/components/ui/button'
import { NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { cn } from '@/lib/utils'

/**
 * "Carried over from yesterday" (UI_SPEC §6): notes edited the day before and not done.
 * Informational, with a one-click Open.
 */
export function CarriedOver({
  notes,
  onOpen,
}: {
  notes: readonly NoteSummary[]
  onOpen: (id: string) => void
}) {
  if (notes.length === 0) return null
  return (
    <section data-testid="log-carried" className="mt-6">
      <h2 className="mb-1 text-2xs text-muted-foreground">Carried over from yesterday</h2>
      {notes.map((note) => (
        <div
          key={note.id}
          data-testid="log-carried-row"
          className="flex h-8 items-center gap-2 text-sm"
        >
          <span
            className={cn('size-2 shrink-0 rounded-full', NOTE_COLOR_CLASSES[note.color].swatch)}
          />
          <span className={cn('min-w-0 flex-1 truncate', !note.title && 'text-muted-foreground')}>
            {note.title || 'Untitled'}
          </span>
          <Button
            data-testid="log-carried-open"
            variant="ghost"
            size="xs"
            className="text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted"
            onClick={() => onOpen(note.id)}
          >
            Open
          </Button>
        </div>
      ))}
    </section>
  )
}
