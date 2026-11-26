import { differenceInCalendarDays, format } from 'date-fns'
import type { RemindOption } from '@shared/constants'
import { dayKey, dayStart, deriveRemindAt, dueState, localInstant, shiftDay } from '@shared/due'
import type { SettingKey, Settings } from '@shared/schemas'
import type { DbHandle } from '../db/client'
import { firstOpenCheckItem } from '../db/derive'
import type { Notifier } from './notify'

/**
 * The reminder scheduler (ARCHITECTURE §2, PRODUCT §3.8). One timer is armed for the next thing
 * due (a reminder, an overdue nudge, the morning summary or the end of a pause), capped at a
 * day; a 60s interval and power resume re-check too, because timers drift or stop while the PC
 * sleeps. Every check reads "now" from the injectable clock, so tests drive it with a fake one.
 *
 * - A reminder fires once: `reminded_at` is set when it's shown (or skipped).
 * - The overdue nudge reuses `reminded_at`: a note with a reminder whose `reminded_at` is before
 *   its due moment gets one more toast once it's overdue. "At due time" reminders never nudge.
 * - Anything more than 2 minutes late (the app wasn't running, the PC slept) is late. One late
 *   item shows as itself; two or more become one "While you were away" summary.
 * - Due reminders off, or paused: reminders are skipped (marked) rather than saved for later,
 *   except that a pause holds them until it ends.
 */

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
/** More than this behind its time, a reminder is "missed" rather than on time. */
export const LATE_MS = 2 * MINUTE
/** The safety re-check (ARCHITECTURE §2). */
export const RECHECK_MS = 60_000

export interface ReminderSettings {
  get<K extends SettingKey>(key: K): Settings[K]
  set<K extends SettingKey>(key: K, value: Settings[K]): void
}

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
  setInterval(fn: () => void, ms: number): unknown
  clearInterval(handle: unknown): void
}

const realTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>),
}

export interface ReminderDeps {
  db: () => DbHandle | null
  now: () => number
  notifier: Notifier
  settings: ReminderSettings
  timers?: Timers
  /** After every check (the tray follows the overdue count and the pause). */
  afterCheck?: () => void
}

interface ReminderRow {
  id: string
  title: string
  body_json: string
  due_day: string
  due_time: string | null
  remind: RemindOption
  remind_at: number | null
  reminded_at: number | null
}

const OPEN = 'done_at IS NULL AND deleted_at IS NULL'

/** When a note becomes overdue: its due time, or the end of its due day. */
export function dueMoment(dueDay: string, dueTime: string | null): number {
  return dueTime === null ? dayStart(shiftDay(dueDay, 1)).getTime() : localInstant(dueDay, dueTime)
}

/** A short day label relative to now: "15:00" today, "Mon" this week, "12 Nov" further back. */
function sinceLabel(dueDay: string, dueTime: string | null, now: number): string {
  const days = differenceInCalendarDays(now, dayStart(dueDay))
  if (days === 0 && dueTime !== null) return dueTime
  if (days < 7) return format(dayStart(dueDay), 'EEE')
  return format(dayStart(dueDay), 'd MMM')
}

/**
 * A reminder's body (UI_SPEC §5d): "Due today at 15:00", "Due today", "Due tomorrow at 09:00",
 * "Due Fri 28 Nov", or "Overdue since Mon", plus " · Next: {item}" for an unticked checklist item.
 * An "At due time" reminder fires on the due moment, which already counts as overdue; it still
 * reads "Due today at 15:00", so the caller says whether to call it overdue.
 */
export function reminderBody(
  dueDay: string,
  dueTime: string | null,
  next: string | null,
  now: number,
  overdue = dueState(dueDay, dueTime, now) === 'overdue',
): string {
  const at = dueTime === null ? '' : ` at ${dueTime}`
  const days = differenceInCalendarDays(dayStart(dueDay), now)
  const main = overdue
    ? `Overdue since ${sinceLabel(dueDay, dueTime, now)}`
    : days === 0
      ? `Due today${at}`
      : days === 1
        ? `Due tomorrow${at}`
        : `Due ${format(dayStart(dueDay), 'EEE d MMM')}${at}`
  return next === null ? main : `${main} · Next: ${next}`
}

/** "3 due today · 1 overdue", leaving out a part that's zero. */
export function morningBody(dueToday: number, overdue: number): string {
  return [dueToday > 0 && `${dueToday} due today`, overdue > 0 && `${overdue} overdue`]
    .filter(Boolean)
    .join(' · ')
}

/** "2 reminders · 1 now overdue", or "3 notes now overdue" with only nudges. */
export function awayBody(reminders: number, overdue: number): string {
  if (reminders === 0) return `${overdue} ${overdue === 1 ? 'note' : 'notes'} now overdue`
  const r = `${reminders} ${reminders === 1 ? 'reminder' : 'reminders'}`
  return overdue > 0 ? `${r} · ${overdue} now overdue` : r
}

function nextItem(bodyJson: string): string | null {
  try {
    const blocks: unknown = JSON.parse(bodyJson)
    return Array.isArray(blocks) ? firstOpenCheckItem(blocks) : null
  } catch {
    return null
  }
}

function timezone(now: number): string {
  return `${Intl.DateTimeFormat().resolvedOptions().timeZone}|${new Date(now).getTimezoneOffset()}`
}

export class ReminderScheduler {
  private readonly timers: Timers
  private timer: unknown = null
  private interval: unknown = null
  private zone: string | null = null
  /** When the next armed timer fires (ms on the injectable clock), for tests. */
  nextAt: number | null = null

  constructor(private readonly deps: ReminderDeps) {
    this.timers = deps.timers ?? realTimers
  }

  /** Starts checking: right away (which also catches what was missed), then on a schedule. */
  start(): void {
    this.stop()
    this.interval = this.timers.setInterval(() => this.check(), RECHECK_MS)
    this.check()
  }

  stop(): void {
    if (this.timer !== null) this.timers.clearTimeout(this.timer)
    if (this.interval !== null) this.timers.clearInterval(this.interval)
    this.timer = null
    this.interval = null
    this.nextAt = null
  }

  /** Shows whatever is due, then arms the timer for what's next. Safe to call any time. */
  check(): void {
    const handle = this.deps.db()
    if (!handle) return
    const now = this.deps.now()
    try {
      this.followTimezone(handle, now)
      const paused = (this.deps.settings.get('notificationsPausedUntil') ?? 0) > now
      if (!paused) {
        this.fireDue(handle, now)
        this.morningSummary(handle, now)
      }
      this.arm(handle, now)
    } catch (err) {
      console.error('[reminders] check failed', err)
    }
    this.deps.afterCheck?.()
  }

  /** A different vault opened: its pending reminders are re-derived on the next check. */
  vaultChanged(): void {
    this.zone = null
    this.check()
  }

  /** On the first check and when the timezone changes, every pending `remind_at` is re-derived. */
  private followTimezone({ sqlite }: DbHandle, now: number): void {
    const zone = timezone(now)
    if (zone === this.zone) return
    this.zone = zone
    const rows = sqlite
      .prepare(
        `SELECT id, due_day, due_time, remind, remind_at FROM notes
         WHERE remind != 'none' AND reminded_at IS NULL AND ${OPEN}`,
      )
      .all() as Pick<ReminderRow, 'id' | 'due_day' | 'due_time' | 'remind' | 'remind_at'>[]
    const update = sqlite.prepare('UPDATE notes SET remind_at = ? WHERE id = ?')
    sqlite.transaction(() => {
      for (const r of rows) {
        const at = deriveRemindAt({ dueDay: r.due_day, dueTime: r.due_time, remind: r.remind })
        if (at !== r.remind_at) update.run(at, r.id)
      }
    })()
  }

  /** Shows the reminders and nudges that are due, and marks them. */
  private fireDue({ sqlite }: DbHandle, now: number): void {
    const due = sqlite
      .prepare(
        `SELECT id, title, body_json, due_day, due_time, remind, remind_at, reminded_at FROM notes
         WHERE remind_at IS NOT NULL AND remind_at <= ? AND reminded_at IS NULL AND ${OPEN}
         ORDER BY remind_at`,
      )
      .all(now) as ReminderRow[]
    const nudges = (
      sqlite
        .prepare(
          `SELECT id, title, body_json, due_day, due_time, remind, remind_at, reminded_at
           FROM notes
           WHERE remind != 'none' AND reminded_at IS NOT NULL AND due_day <= ? AND ${OPEN}`,
        )
        .all(dayKey(now)) as ReminderRow[]
    ).filter((r) => {
      const moment = dueMoment(r.due_day, r.due_time)
      return moment <= now && r.reminded_at! < moment
    })
    if (due.length === 0 && nudges.length === 0) return

    if (this.deps.settings.get('remindersOn')) {
      const late = (at: number): boolean => at < now - LATE_MS
      const lateDue = due.filter((r) => late(r.remind_at!))
      const lateNudges = nudges.filter((r) => late(dueMoment(r.due_day, r.due_time)))
      for (const r of [...due, ...nudges]) {
        if (lateDue.includes(r) || lateNudges.includes(r)) continue
        this.showReminder(r, now, nudges.includes(r))
      }
      const lateCount = lateDue.length + lateNudges.length
      if (lateCount === 1) {
        this.showReminder((lateDue[0] ?? lateNudges[0])!, now, lateNudges.length === 1)
      } else if (lateCount > 1) {
        const overdue = [...lateDue, ...lateNudges].filter(
          (r) => dueState(r.due_day, r.due_time, now) === 'overdue',
        ).length
        this.deps.notifier.show({
          title: 'While you were away',
          body: awayBody(lateDue.length, overdue),
          link: 'sprawl://list/due',
        })
      }
    }

    const mark = sqlite.prepare('UPDATE notes SET reminded_at = ? WHERE id = ?')
    sqlite.transaction(() => {
      for (const r of [...due, ...nudges]) mark.run(now, r.id)
    })()
  }

  /** A reminder (or, as a nudge, the note now overdue) as a toast that opens the note. */
  private showReminder(r: ReminderRow, now: number, nudge: boolean): void {
    // On time, a reminder is "due" even on the due moment itself; a nudge is overdue.
    const overdue = nudge || now - dueMoment(r.due_day, r.due_time) >= LATE_MS
    this.deps.notifier.show({
      title: r.title,
      body: reminderBody(r.due_day, r.due_time, nextItem(r.body_json), now, overdue),
      link: `sprawl://note/${r.id}`,
    })
  }

  /** Once a day at the chosen time, if anything is due today or overdue. */
  private morningSummary({ sqlite }: DbHandle, now: number): void {
    const { on, time } = this.deps.settings.get('morningSummary')
    const today = dayKey(now)
    if (!on || this.deps.settings.get('morningSummarySentOn') === today) return
    if (now < localInstant(today, time)) return
    const rows = sqlite
      .prepare(`SELECT due_day, due_time FROM notes WHERE due_day <= ? AND ${OPEN}`)
      .all(today) as { due_day: string; due_time: string | null }[]
    let dueToday = 0
    let overdue = 0
    for (const r of rows) {
      if (dueState(r.due_day, r.due_time, now) === 'overdue') overdue++
      else if (r.due_day === today) dueToday++
    }
    this.deps.settings.set('morningSummarySentOn', today)
    if (dueToday + overdue === 0) return
    this.deps.notifier.show({
      title: 'Today in Sprawl',
      body: morningBody(dueToday, overdue),
      link: 'sprawl://list/due',
      silent: true,
    })
  }

  /** The soonest future moment anything is due, or null. */
  nextDue(handle: DbHandle, now: number): number | null {
    const { sqlite } = handle
    const candidates: number[] = []
    const paused = this.deps.settings.get('notificationsPausedUntil')
    if (paused !== null && paused > now) return paused
    const nextRemind = sqlite
      .prepare(
        `SELECT min(remind_at) FROM notes
         WHERE remind_at > ? AND reminded_at IS NULL AND ${OPEN}`,
      )
      .pluck()
      .get(now) as number | null
    if (nextRemind !== null) candidates.push(nextRemind)
    const nudgeRows = sqlite
      .prepare(
        `SELECT due_day, due_time, reminded_at FROM notes
         WHERE remind != 'none' AND due_day >= ? AND ${OPEN}`,
      )
      .all(shiftDay(dayKey(now), -1)) as Pick<ReminderRow, 'due_day' | 'due_time' | 'reminded_at'>[]
    for (const r of nudgeRows) {
      const moment = dueMoment(r.due_day, r.due_time)
      if (moment > now && (r.reminded_at === null || r.reminded_at < moment))
        candidates.push(moment)
    }
    const { on, time } = this.deps.settings.get('morningSummary')
    if (on) {
      const today = dayKey(now)
      const sent = this.deps.settings.get('morningSummarySentOn') === today
      const todayAt = localInstant(today, time)
      candidates.push(!sent && todayAt > now ? todayAt : localInstant(shiftDay(today, 1), time))
    }
    return candidates.length === 0 ? null : Math.min(...candidates)
  }

  private arm(handle: DbHandle, now: number): void {
    if (this.timer !== null) this.timers.clearTimeout(this.timer)
    this.timer = null
    const next = this.nextDue(handle, now)
    this.nextAt = next
    if (next === null) return
    // Capped at a day, then recomputed; a timer that wakes early just checks and re-arms.
    const delay = Math.min(Math.max(next - now, 0), DAY)
    this.timer = this.timers.setTimeout(() => this.check(), delay)
  }
}
