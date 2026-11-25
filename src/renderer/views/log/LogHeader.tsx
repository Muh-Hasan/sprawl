import { format } from 'date-fns'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { dayStart } from '@shared/due'
import { IconButton } from '@/components/IconButton'
import { Button } from '@/components/ui/button'
import { LOG_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { MonthPicker } from './MonthPicker'

interface LogHeaderProps {
  day: string
  today: string
  onPick: (day: string | null) => void
  onStep: (dir: -1 | 1) => void
}

/**
 * The log header (UI_SPEC §6): the date with a "Today" tag (or "Go to today"), then ← and →
 * and the month popover on the right.
 */
export function LogHeader({ day, today, onPick, onStep }: LogHeaderProps) {
  const isToday = day === today
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <h1 data-testid="log-date" data-day={day} className="truncate text-lg font-semibold">
          {format(dayStart(day), 'EEEE, d MMMM')}
        </h1>
        {isToday ? (
          <span data-testid="log-today-tag" className="text-xs text-muted-foreground">
            Today
          </span>
        ) : (
          <Button
            data-testid="log-go-today"
            variant="ghost"
            size="xs"
            className="text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted"
            onClick={() => onPick(null)}
          >
            Go to today
          </Button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          data-testid="log-prev"
          icon={IconChevronLeft}
          label="Previous day"
          shortcut={shortcutLabel(LOG_SHORTCUTS.prevDay)}
          onClick={() => onStep(-1)}
        />
        <IconButton
          data-testid="log-next"
          icon={IconChevronRight}
          label="Next day"
          shortcut={shortcutLabel(LOG_SHORTCUTS.nextDay)}
          disabled={isToday}
          onClick={() => onStep(1)}
        />
        <MonthPicker day={day} today={today} onPick={onPick} />
      </div>
    </header>
  )
}
