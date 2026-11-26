import { memo, useState } from 'react'
import {
  IconCalendarDue,
  IconChecklist,
  IconCopy,
  IconDots,
  IconFocus2,
  IconLayoutDashboard,
  IconLink,
  IconTrash,
} from '@tabler/icons-react'
import { dueChipLabel, dueState } from '@shared/due'
import type { NoteListRow } from '@shared/types'
import { Chip } from '@/components/Chip'
import { IconButton } from '@/components/IconButton'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenuContent, DropdownMenuItem } from '@/components/Menu'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { cn } from '@/lib/utils'
import { doneLabel, editedLabel } from './listLogic'

export interface RowActions {
  open(id: string): void
  toggleDone(row: NoteListRow): void
  showOnCanvas(id: string): void
  place(id: string): void
  duplicate(id: string): void
  remove(id: string): void
}

interface NoteRowProps {
  row: NoteListRow
  now: number
  /** The keyboard-selected row. */
  selected: boolean
  /** Marked done (or not done) and fading out of its tab. */
  leaving: boolean
  actions: RowActions
}

/**
 * One row of the List view (UI_SPEC §5b), 44px: the done checkbox, color dot, title, first body
 * line (from 1100px wide), the card chips, "Not on canvas", and the edited (or done) time, which
 * the hover actions replace.
 */
export const NoteRow = memo(function NoteRow({
  row,
  now,
  selected,
  leaving,
  actions,
}: NoteRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const done = row.doneAt !== null
  const time = done ? doneLabel(row.doneAt!, now) : editedLabel(row.updatedAt, now)
  return (
    <div
      role="option"
      aria-selected={selected}
      data-testid="list-row"
      data-note-id={row.id}
      data-selected={selected || undefined}
      data-leaving={leaving || undefined}
      onClick={() => actions.open(row.id)}
      className={cn(
        'group relative flex h-11 cursor-default items-center gap-3 border-b border-border px-3 transition-opacity duration-[180ms] ease-(--ease-in) hover:bg-muted',
        selected && 'bg-muted',
        leaving && 'pointer-events-none opacity-0',
      )}
    >
      {selected && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-foreground" />}
      <Checkbox
        data-testid="list-row-check"
        aria-label={done ? 'Mark not done' : 'Mark done'}
        checked={done}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={() => actions.toggleDone(row)}
      />
      <span
        aria-hidden
        className={cn('size-2 shrink-0 rounded-full', NOTE_COLOR_CLASSES[row.color].swatch)}
      />
      <span
        data-testid="list-row-title"
        className={cn(
          'min-w-0 truncate text-sm font-medium',
          row.title === '' && 'text-subtle-foreground',
        )}
      >
        {row.title || 'Untitled'}
      </span>
      <span className="hidden min-w-0 flex-1 truncate text-sm text-subtle-foreground min-[1100px]:block">
        {row.firstLine}
      </span>
      <span className="flex-1 min-[1100px]:hidden" />
      <span className="flex shrink-0 items-center gap-1.5">
        {row.checkTotal > 0 && (
          <Chip data-testid="list-row-checklist" icon={IconChecklist}>
            {row.checkDone}/{row.checkTotal}
          </Chip>
        )}
        {row.dueDay !== null && (
          <Chip
            data-testid="list-row-due"
            icon={IconCalendarDue}
            due={done ? undefined : dueState(row.dueDay, row.dueTime, now)}
          >
            {dueChipLabel(row.dueDay, now)}
          </Chip>
        )}
        {row.linkCount > 0 && (
          <Chip data-testid="list-row-links" icon={IconLink}>
            {row.linkCount}
          </Chip>
        )}
        {!row.onCanvas && (
          <span
            data-testid="list-row-not-on-canvas"
            className="rounded-[5px] bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground"
          >
            Not on canvas
          </span>
        )}
      </span>
      <span
        data-testid="list-row-time"
        className={cn(
          'w-16 shrink-0 text-right font-mono text-xs text-subtle-foreground group-hover:hidden',
          menuOpen && 'hidden',
        )}
      >
        {time}
      </span>
      <span
        className={cn('hidden w-16 shrink-0 justify-end group-hover:flex', menuOpen && 'flex')}
        onClick={(e) => e.stopPropagation()}
      >
        {row.onCanvas && !done && (
          <IconButton
            data-testid="list-row-show"
            icon={IconFocus2}
            label="Show on canvas"
            size="sm"
            onClick={() => actions.showOnCanvas(row.id)}
          />
        )}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <IconButton data-testid="list-row-menu" icon={IconDots} label="More" size="sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {!row.onCanvas && (
              <DropdownMenuItem data-testid="list-row-place" onSelect={() => actions.place(row.id)}>
                <IconLayoutDashboard stroke={1.75} />
                Place on canvas
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              data-testid="list-row-duplicate"
              onSelect={() => actions.duplicate(row.id)}
            >
              <IconCopy stroke={1.75} />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="list-row-delete"
              variant="destructive"
              onSelect={() => actions.remove(row.id)}
            >
              <IconTrash stroke={1.75} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </div>
  )
})
