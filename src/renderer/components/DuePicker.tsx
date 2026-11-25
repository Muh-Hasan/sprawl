import { useEffect, useRef, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { addDays, nextMonday } from 'date-fns'
import { REMIND_NEEDS_TIME, type RemindOption } from '@shared/constants'
import { dayKey, dayStart, type DueFields } from '@shared/due'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { nudgeTime, parseTime } from '@/lib/time'
import { cn } from '@/lib/utils'

/** The "Remind me" choices (PRODUCT §3.2), in menu order. */
const REMIND_LABELS: Record<RemindOption, string> = {
  none: 'None',
  at: 'At due time',
  '15m': '15 min before',
  '1h': '1 hour before',
  morning: 'Morning of (9:00)',
  '1d': '1 day before',
}

/** The time "Add time" starts from. */
const DEFAULT_TIME = '09:00'

interface DuePickerProps {
  value: DueFields
  onChange(patch: Partial<DueFields>): void
  open: boolean
  onOpenChange(open: boolean): void
  /** The trigger: "Add due date" or the date chip. */
  children: React.ReactElement
  /** Today, for the quick picks (injectable for tests). */
  now?: () => number
}

/**
 * The due-date popover (UI_SPEC §5): quick picks and a calendar, then the optional time and
 * the "Remind me" select. The reminders that count back from the due time are disabled until
 * there's a time, and clearing the time resets them to None (main does the same on save).
 */
export function DuePicker({
  value,
  onChange,
  open,
  onOpenChange,
  children,
  now = Date.now,
}: DuePickerProps) {
  const pick = (date: Date): void => onChange({ dueDay: dayKey(date.getTime()) })
  const today = new Date(now())
  const selected = value.dueDay === null ? undefined : dayStart(value.dueDay)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        data-testid="due-picker"
        align="start"
        collisionPadding={8}
        className="w-[300px] p-0 shadow-(--shadow-popover)"
      >
        <div className="flex">
          <div className="flex w-[84px] shrink-0 flex-col gap-0.5 border-r border-border p-1.5">
            <QuickPick testId="due-today" onClick={() => pick(today)}>
              Today
            </QuickPick>
            <QuickPick testId="due-tomorrow" onClick={() => pick(addDays(today, 1))}>
              Tomorrow
            </QuickPick>
            <QuickPick testId="due-next-week" onClick={() => pick(nextMonday(today))}>
              Next week
            </QuickPick>
            <QuickPick
              testId="due-clear"
              disabled={value.dueDay === null}
              onClick={() => {
                onChange({ dueDay: null, dueTime: null, remind: 'none' })
                onOpenChange(false)
              }}
            >
              Clear
            </QuickPick>
          </div>
          <Calendar
            data-testid="due-calendar"
            mode="single"
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected ?? today}
            onSelect={(date) => date && pick(date)}
            className="p-2 [--cell-size:--spacing(7)]"
          />
        </div>
        <div className="flex flex-col gap-1 border-t border-border p-2 text-sm">
          <TimeRow value={value} onChange={onChange} />
          <RemindRow value={value} onChange={onChange} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function QuickPick({
  testId,
  disabled,
  onClick,
  children,
}: {
  testId: string
  disabled?: boolean
  onClick(): void
  children: React.ReactNode
}) {
  return (
    <Button
      data-testid={testId}
      variant="ghost"
      size="xs"
      disabled={disabled}
      onClick={onClick}
      className="justify-start font-normal text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted"
    >
      {children}
    </Button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function TimeRow({ value, onChange }: Pick<DuePickerProps, 'value' | 'onChange'>) {
  const [editing, setEditing] = useState(false)
  const noDay = value.dueDay === null
  if (value.dueTime === null && !editing) {
    return (
      <Row label="Time">
        <Button
          data-testid="due-add-time"
          variant="ghost"
          size="xs"
          disabled={noDay}
          onClick={() => {
            onChange({ dueTime: DEFAULT_TIME })
            setEditing(true)
          }}
          className="text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted"
        >
          Add time
        </Button>
      </Row>
    )
  }
  return (
    <Row label="Time">
      <div className="flex items-center gap-1">
        <TimeInput
          key={value.dueTime ?? DEFAULT_TIME}
          value={value.dueTime ?? DEFAULT_TIME}
          autoFocus={editing}
          onCommit={(time) => {
            setEditing(false)
            onChange({ dueTime: time })
          }}
        />
        <Button
          data-testid="due-clear-time"
          variant="ghost"
          size="icon-xs"
          aria-label="Clear time"
          onClick={() => {
            setEditing(false)
            onChange({ dueTime: null })
          }}
          className="text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted"
        >
          <IconX stroke={1.75} />
        </Button>
      </div>
    </Row>
  )
}

/**
 * An `HH:mm` field: type a time (9, 930, 9:30…), or step it by 15 minutes with the arrow keys.
 * It's saved on Enter or blur; something that isn't a time goes back to the last value.
 */
function TimeInput({
  value,
  autoFocus,
  onCommit,
}: {
  value: string
  autoFocus: boolean
  onCommit(time: string): void
}) {
  // Keyed by its value (below), so a new value from outside starts it over.
  const [text, setText] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) ref.current?.select()
  }, [autoFocus])

  const commit = (): void => {
    const time = parseTime(text)
    if (time === null) setText(value)
    else if (time !== value) onCommit(time)
    else setText(value)
  }

  return (
    <input
      ref={ref}
      data-testid="due-time-input"
      aria-label="Due time"
      inputMode="numeric"
      value={text}
      autoFocus={autoFocus}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          // Stepping only changes the field; Enter or leaving it saves.
          setText(nudgeTime(parseTime(text) ?? value, e.key === 'ArrowUp' ? 1 : -1))
        }
      }}
      className={cn(
        'h-6 w-16 rounded-md border border-input bg-transparent px-2 text-center font-mono text-xs tabular-nums outline-none',
        'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
      )}
    />
  )
}

function RemindRow({ value, onChange }: Pick<DuePickerProps, 'value' | 'onChange'>) {
  const noTime = value.dueTime === null
  return (
    <Row label="Remind me">
      <Select
        value={value.remind}
        disabled={value.dueDay === null}
        onValueChange={(remind) => onChange({ remind: remind as RemindOption })}
      >
        <SelectTrigger data-testid="due-remind" size="sm" className="h-7 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent data-testid="due-remind-options">
          {(Object.keys(REMIND_LABELS) as RemindOption[]).map((option) => {
            const needsTime = noTime && REMIND_NEEDS_TIME.has(option)
            return (
              <SelectItem
                key={option}
                value={option}
                disabled={needsTime}
                data-testid={`remind-${option}`}
                className="text-xs"
              >
                {REMIND_LABELS[option]}
                {/* A disabled item can't show a tooltip (it takes no pointer events). */}
                {needsTime && <span className="text-subtle-foreground">· Add a time first</span>}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </Row>
  )
}
