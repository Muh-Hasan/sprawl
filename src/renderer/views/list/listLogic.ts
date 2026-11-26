import { differenceInCalendarDays, format, getDay } from 'date-fns'
import { dayStart, dueState } from '@shared/due'
import type { ListTab, NoteListRow } from '@shared/types'

/**
 * The List view's pure logic (PRODUCT §3.3, UI_SPEC §5b): the Due tab's groups, the time each row
 * shows, and the header count.
 */

export const DUE_GROUPS = ['overdue', 'today', 'tomorrow', 'week', 'later'] as const
export type DueGroup = (typeof DUE_GROUPS)[number]

export const DUE_GROUP_LABELS: Record<DueGroup, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This week',
  later: 'Later',
}

/**
 * Which Due group a note falls in. "This week" runs to Sunday (weeks start on Monday, as in the
 * date picker's "Next week"), so on a Saturday or Sunday it's empty.
 */
export function dueGroupOf(dueDay: string, dueTime: string | null, now: number): DueGroup {
  if (dueState(dueDay, dueTime, now) === 'overdue') return 'overdue'
  const days = differenceInCalendarDays(dayStart(dueDay), now)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  const toSunday = (7 - getDay(now)) % 7
  return days <= toSunday ? 'week' : 'later'
}

export interface RowGroup {
  group: DueGroup
  rows: NoteListRow[]
}

/** The Due tab's rows in their groups, in order, leaving out empty groups. Rows keep their order. */
export function groupByDue(rows: readonly NoteListRow[], now: number): RowGroup[] {
  const groups = new Map<DueGroup, NoteListRow[]>(DUE_GROUPS.map((g) => [g, []]))
  for (const row of rows) {
    if (row.dueDay === null) continue
    groups.get(dueGroupOf(row.dueDay, row.dueTime, now))!.push(row)
  }
  return DUE_GROUPS.flatMap((group) => {
    const list = groups.get(group)!
    return list.length > 0 ? [{ group, rows: list }] : []
  })
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** "now", "5m ago", "2h ago", "3d ago", then "12 Nov" (or "12 Nov 2025" in another year). */
export function editedLabel(at: number, now: number): string {
  const ago = Math.max(0, now - at)
  if (ago < MINUTE) return 'now'
  if (ago < HOUR) return `${Math.floor(ago / MINUTE)}m ago`
  if (ago < 24 * HOUR) return `${Math.floor(ago / HOUR)}h ago`
  const days = differenceInCalendarDays(now, at)
  if (days < 7) return `${days}d ago`
  return format(
    at,
    new Date(at).getFullYear() === new Date(now).getFullYear() ? 'd MMM' : 'd MMM yy',
  )
}

/** The Done tab's time: "18:30" today, "Mon" this week, "12 Nov" before. */
export function doneLabel(at: number, now: number): string {
  const days = differenceInCalendarDays(now, at)
  if (days === 0) return format(at, 'HH:mm')
  if (days < 7) return format(at, 'EEE')
  return format(at, 'd MMM')
}

/** The header count: "24 open", "5 due", "12 done", "40 notes". */
export function countLabel(tab: ListTab, count: number): string {
  if (tab === 'all') return `${count} ${count === 1 ? 'note' : 'notes'}`
  return `${count} ${tab}`
}

/** A row leaves its tab when marked done (Open, Due) or not done (Done). */
export function leavesTab(tab: ListTab, done: boolean): boolean {
  return tab === 'done' ? !done : tab !== 'all' && done
}
