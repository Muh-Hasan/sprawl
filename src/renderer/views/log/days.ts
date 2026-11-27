import { shiftDay } from '@shared/due'

/** The week strip shows this many days (UI_SPEC §6). */
export const STRIP_DAYS = 7

/**
 * The days in the week strip, oldest first: the last 7 days ending today while the selected
 * day is among them, otherwise the 7 days ending on the selected day (so it's always showing).
 */
export function stripDays(selected: string, today: string): string[] {
  const end = selected > shiftDay(today, -STRIP_DAYS) && selected <= today ? today : selected
  return Array.from({ length: STRIP_DAYS }, (_, i) => shiftDay(end, i - (STRIP_DAYS - 1)))
}

/** The month (`YYYY-MM`) of a day key. */
export function monthOf(day: string): string {
  return day.slice(0, 7)
}

/** The distinct months the given days fall in, in order. */
export function monthsOf(days: readonly string[]): string[] {
  return [...new Set(days.map(monthOf))].sort()
}

/** The day before or after `day`; never past today going forward. */
export function stepDay(day: string, dir: -1 | 1, today: string): string {
  const next = shiftDay(day, dir)
  return next > today ? today : next
}

export interface SummaryTile {
  id: 'done' | 'logged' | 'streak'
  value: string
  label: string
}

/** The three summary tiles (UI_SPEC §6), singular for one. The streak is blank until it loads. */
export function summaryTiles(done: number, logged: number, streak: number | null): SummaryTile[] {
  return [
    { id: 'done', value: String(done), label: done === 1 ? 'note done' : 'notes done' },
    { id: 'logged', value: String(logged), label: logged === 1 ? 'thing logged' : 'things logged' },
    {
      id: 'streak',
      value: streak === null ? '–' : `${streak} ${streak === 1 ? 'day' : 'days'}`,
      label: 'in a row',
    },
  ]
}
