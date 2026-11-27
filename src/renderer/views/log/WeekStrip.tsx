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
 * The week strip (UI_SPEC §6): seven equal 68px cells, weekday over day number, a dot under days
 * with entries. The selected day is filled; today has a stronger border.
 */
export function WeekStrip({ days, selected, today, marked, onPick }: WeekStripProps) {
  return (
    <div data-testid="log-week-strip" className="mt-6 grid grid-cols-7 gap-2">
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
              'flex h-[68px] flex-col items-center justify-center gap-0.5 rounded-xl border border-muted bg-surface outline-none',
              'transition-colors duration-120 hover:bg-popover focus-visible:ring-2 focus-visible:ring-ring/50',
              isSelected && 'bg-muted hover:bg-muted',
              isToday && 'border-border-strong',
            )}
          >
            <span
              className={cn(
                'text-2xs font-normal',
                isSelected ? 'text-muted-foreground' : 'text-subtle-foreground',
              )}
            >
              {format(date, 'EEE')}
            </span>
            <span className="text-[18px] leading-6 font-semibold">{format(date, 'd')}</span>
            <span
              aria-hidden
              className={cn('size-[5px] rounded-full', hasEntries && 'bg-muted-foreground')}
            />
          </button>
        )
      })}
    </div>
  )
}
