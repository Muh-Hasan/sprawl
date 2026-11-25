import { lazy, Suspense, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { IconCalendar } from '@tabler/icons-react'
import { dayStart } from '@shared/due'
import { IconButton } from '@/components/IconButton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { monthOf } from './days'

const MonthCalendar = lazy(() => import('./MonthCalendar'))

interface MonthPickerProps {
  day: string
  today: string
  onPick: (day: string) => void
}

/**
 * The log's month popover (UI_SPEC §6): a calendar where days with entries carry a dot. Days
 * after today can't be picked.
 */
export function MonthPicker({ day, today, onPick }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => dayStart(day))
  const [marked, setMarked] = useState<Date[]>([])

  useEffect(() => {
    if (!open) return
    let live = true
    void window.sprawl.log.daysWithEntries(format(month, 'yyyy-MM')).then((days) => {
      if (live) setMarked(days.map(dayStart))
    })
    return () => {
      live = false
    }
  }, [open, month])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // Opens on the month of the day being shown.
        if (next && monthOf(day) !== format(month, 'yyyy-MM')) setMonth(dayStart(day))
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <IconButton data-testid="log-calendar" icon={IconCalendar} label="Pick a day" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        data-testid="log-month-picker"
        className="w-auto p-0 shadow-(--shadow-popover)"
      >
        <Suspense fallback={<div className="size-72" />}>
          <MonthCalendar
            day={day}
            today={today}
            month={month}
            onMonthChange={setMonth}
            marked={marked}
            onPick={(picked) => {
              onPick(picked)
              setOpen(false)
            }}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  )
}
