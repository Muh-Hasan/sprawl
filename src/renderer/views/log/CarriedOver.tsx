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
    <section data-testid="log-carried" className="mt-8 flex flex-col gap-1.5">
      <h2 className="mb-0.5 text-xs font-semibold text-muted-foreground">
        Carried over from yesterday
      </h2>
      {notes.map((note) => (
        <div
          key={note.id}
          data-testid="log-carried-row"
          className="flex h-11 items-center gap-3 rounded-[10px] border border-muted px-3"
        >
          <span
            className={cn('size-2.5 shrink-0 rounded-[3px]', NOTE_COLOR_CLASSES[note.color].swatch)}
          />
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-base',
              !note.title && 'text-muted-foreground',
            )}
          >
            {note.title || 'Untitled'}
          </span>
          <Button
            data-testid="log-carried-open"
            variant="ghost"
            size="sm"
            className="-mr-1.5 h-[30px] rounded-lg px-2.5 text-xs font-normal text-foreground hover:bg-muted dark:hover:bg-muted"
            onClick={() => onOpen(note.id)}
          >
            Open
          </Button>
        </div>
      ))}
    </section>
  )
}
