import type { NoteListRow } from '@shared/types'
import { ShortcutKbd } from '@/components/ShortcutKbd'
import { CommandItem } from '@/components/ui/command'
import { NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { cn } from '@/lib/utils'
import { useClockStore } from '@/stores/clockStore'
import type { PaletteCommand } from './commands'
import { noteContext } from './paletteQuery'

/** A result row (UI_SPEC §8): 44px, 10px radius, `--muted` when selected. */
const ROW =
  'h-11 gap-3 rounded-[10px] px-3 py-0 text-base data-[selected=true]:bg-muted data-[selected=true]:text-foreground'

/** A note result: its color, title, first line and where it stands. */
export function NoteResult({ row, onSelect }: { row: NoteListRow; onSelect(): void }) {
  const now = useClockStore((s) => s.now)
  return (
    <CommandItem
      value={`note:${row.id}`}
      data-testid={`palette-note-${row.id}`}
      onSelect={onSelect}
      className={ROW}
    >
      <span
        aria-hidden
        className={cn('mx-1 size-3 shrink-0 rounded-[4px]', NOTE_COLOR_CLASSES[row.color].swatch)}
      />
      <span
        className={cn(
          'max-w-[60%] shrink-0 truncate font-medium',
          row.title ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {row.title || 'Untitled'}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-subtle-foreground">
        {row.firstLine}
      </span>
      <span className="shrink-0 text-2xs text-subtle-foreground">{noteContext(row, now)}</span>
    </CommandItem>
  )
}

/** A command: its icon in a 28px tile, the label and its keys. */
export function CommandResult({
  command,
  onSelect,
}: {
  command: PaletteCommand
  onSelect(): void
}) {
  const Icon = command.icon
  return (
    <CommandItem
      value={`command:${command.id}`}
      data-testid={`palette-command-${command.id}`}
      onSelect={onSelect}
      className={cn(ROW, 'text-foreground/90')}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon aria-hidden className="size-4 text-muted-foreground" stroke={1.75} />
      </span>
      <span className="flex-1 truncate">{command.label}</span>
      {command.keys && (
        <span className="flex gap-1">
          {command.keys.map((key) => (
            <ShortcutKbd key={key} className="min-w-[22px] justify-center">
              {key}
            </ShortcutKbd>
          ))}
        </span>
      )}
    </CommandItem>
  )
}
