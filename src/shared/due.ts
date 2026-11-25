import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { MORNING_REMINDER_TIME, REMIND_NEEDS_TIME, type RemindOption } from './constants'

/**
 * Due dates and reminders (ARCHITECTURE §4). A due date is a local wall-clock day
 * (`YYYY-MM-DD`) with an optional local time (`HH:mm`), so it stays put if the timezone
 * changes. Everything here reads the machine's current timezone through `Date`.
 */

export type DueState = 'overdue' | 'soon' | 'later'

export interface DueFields {
  dueDay: string | null
  dueTime: string | null
  remind: RemindOption
}

const MINUTE = 60_000

/** How long before the due time each counting-back reminder fires. */
const REMIND_BEFORE: Partial<Record<RemindOption, number>> = { at: 0, '15m': 15, '1h': 60 }

/** The local day key (`YYYY-MM-DD`) of an instant. */
export function dayKey(ms: number): string {
  return format(ms, 'yyyy-MM-dd')
}

/** Local midnight at the start of a day key, as a Date. */
export function dayStart(day: string): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

/** The instant of a local wall-clock day and time, in the current timezone. */
export function localInstant(day: string, time: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const [h, min] = time.split(':').map(Number) as [number, number]
  return new Date(y, m - 1, d, h, min).getTime()
}

/** The day key `n` days after `day` (calendar days, so DST doesn't matter). */
export function shiftDay(day: string, n: number): string {
  return format(addDays(dayStart(day), n), 'yyyy-MM-dd')
}

/**
 * Makes the due fields consistent: no day means no time and no reminder, and a reminder that
 * counts back from the due time resets to none without one (PRODUCT §3.2).
 */
export function normalizeDue({ dueDay, dueTime, remind }: DueFields): DueFields {
  if (dueDay === null) return { dueDay: null, dueTime: null, remind: 'none' }
  if (dueTime === null && REMIND_NEEDS_TIME.has(remind)) return { dueDay, dueTime, remind: 'none' }
  return { dueDay, dueTime, remind }
}

/**
 * When the reminder fires (ms UTC), or null for none: the due time minus 0, 15 or 60 minutes,
 * or 09:00 local on the due day ("morning") or the day before ("1d").
 */
export function deriveRemindAt(fields: DueFields): number | null {
  const { dueDay, dueTime, remind } = normalizeDue(fields)
  if (dueDay === null || remind === 'none') return null
  if (remind === 'morning') return localInstant(dueDay, MORNING_REMINDER_TIME)
  if (remind === '1d') return localInstant(shiftDay(dueDay, -1), MORNING_REMINDER_TIME)
  const before = REMIND_BEFORE[remind]
  if (dueTime === null || before === undefined) return null
  // Subtracting real minutes from the due instant is right across a DST change too.
  return localInstant(dueDay, dueTime) - before * MINUTE
}

/**
 * Overdue once past the due time, or past the end of the due day without one; soon when the
 * due day is 2 days away or less; later otherwise.
 */
export function dueState(dueDay: string, dueTime: string | null, now: number): DueState {
  const due =
    dueTime === null ? dayStart(shiftDay(dueDay, 1)).getTime() : localInstant(dueDay, dueTime)
  if (now >= due) return 'overdue'
  return differenceInCalendarDays(dayStart(dueDay), now) <= 2 ? 'soon' : 'later'
}

/** The card chip label: "Today", "Tomorrow", "Yesterday", a weekday this week, or "12 Dec". */
export function dueChipLabel(dueDay: string, now: number): string {
  const date = dayStart(dueDay)
  const days = differenceInCalendarDays(date, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1 && days < 7) return format(date, 'EEE')
  return format(date, date.getFullYear() === new Date(now).getFullYear() ? 'd MMM' : 'd MMM yyyy')
}

/** The panel's due label: "Fri 28 Nov", or "Fri 28 Nov · 15:00" with a time. */
export function dueLongLabel(dueDay: string, dueTime: string | null): string {
  const day = format(dayStart(dueDay), 'EEE d MMM')
  return dueTime === null ? day : `${day} · ${dueTime}`
}

/** When a reminder fires, as the panel shows it: "Fri 14:45", or "12 Dec 14:45" further out. */
export function reminderLabel(remindAt: number, now: number): string {
  const days = differenceInCalendarDays(remindAt, now)
  if (days === 0) return `today ${format(remindAt, 'HH:mm')}`
  if (days === 1) return `tomorrow ${format(remindAt, 'HH:mm')}`
  return format(remindAt, days > 1 && days < 7 ? 'EEE HH:mm' : 'd MMM HH:mm')
}
