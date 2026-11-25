import { format } from 'date-fns'
import { dayStart } from '@shared/due'
import { cn } from '@/lib/utils'

interface WeekStripProps {
  days: readonly string[]
  selected: string
  today: string
  /** Days that have entries get a dot. */
  marked: ReadonlySet<string>
  onPick: (day: string) => void
}

/**
 * The week strip (UI_SPEC §6): seven equal cells, weekday over day number, a dot under days
 * with entries. The selected day is filled; today has a ring.
 */
export function WeekStrip({ days, selected, today, marked, onPick }: WeekStripProps) {
  return (
    <div data-testid="log-week-strip" className="mt-4 grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const date = dayStart(day)
        const isSelected = day === selected
        const isToday = day === today
        const hasEntries = marked.has(day)
        return (
          <button
            key={day}
            type="button"
            data-testid="log-strip-day"
            data-day={day}
            data-selected={isSelected || undefined}
            data-today={isToday || undefined}
            data-has-entries={hasEntries || undefined}
            aria-label={format(date, 'EEEE d MMMM')}
            aria-current={isSelected ? 'date' : undefined}
            onClick={() => onPick(day)}
            className={cn(
              'flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg outline-none',
              'transition-colors duration-120 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50',
              isSelected && 'bg-muted text-foreground hover:bg-muted',
              isToday && 'ring-1 ring-border-strong',
            )}
          >
            <span className="text-2xs text-subtle-foreground">{format(date, 'EEE')}</span>
            <span className="text-sm font-medium">{format(date, 'd')}</span>
            <span
              aria-hidden
              className={cn('size-1 rounded-full', hasEntries ? 'bg-muted-foreground' : '')}
            />
          </button>
        )
      })}
    </div>
  )
}
