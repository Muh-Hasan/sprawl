import { dayKey, dayStart } from '@shared/due'
import { Calendar } from '@/components/ui/calendar'

interface MonthCalendarProps {
  day: string
  today: string
  month: Date
  onMonthChange: (month: Date) => void
  /** Days with entries, marked with a dot. */
  marked: Date[]
  onPick: (day: string) => void
}

/**
 * The month popover's calendar. It loads the first time the popover opens, so the date picker
 * library stays out of the startup bundle (ARCHITECTURE §6).
 */
export default function MonthCalendar({
  day,
  today,
  month,
  onMonthChange,
  marked,
  onPick,
}: MonthCalendarProps) {
  return (
    <Calendar
      mode="single"
      weekStartsOn={1}
      selected={dayStart(day)}
      month={month}
      onMonthChange={onMonthChange}
      disabled={{ after: dayStart(today) }}
      modifiers={{ logged: marked }}
      modifiersClassNames={{
        logged:
          'relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-muted-foreground',
      }}
      onSelect={(date) => date && onPick(dayKey(date.getTime()))}
      className="p-2 [--cell-size:--spacing(8)]"
    />
  )
}
