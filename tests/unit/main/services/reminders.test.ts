import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { NotesService } from '../../../../src/main/services/notes'
import type { Toast } from '../../../../src/main/services/notify'
import {
  awayBody,
  morningBody,
  ReminderScheduler,
  reminderBody,
  type Timers,
} from '../../../../src/main/services/reminders'
import type { RemindOption } from '../../../../src/shared/constants'
import { localInstant } from '../../../../src/shared/due'
import { defaultSettings, type SettingKey, type Settings } from '../../../../src/shared/schemas'

const savedTz = process.env['TZ']
afterAll(() => {
  if (savedTz === undefined) delete process.env['TZ']
  else process.env['TZ'] = savedTz
})

let handle: DbHandle
let now = 0
let notes: NotesService
let shown: Toast[]
let settings: Settings
let timers: FakeTimers
let scheduler: ReminderScheduler

/** Records the armed timer instead of waiting: tests move the clock and call check(). */
class FakeTimers implements Timers {
  timeout: { fn: () => void; ms: number } | null = null
  intervals = 0
  setTimeout(fn: () => void, ms: number): unknown {
    this.timeout = { fn, ms }
    return this.timeout
  }
  clearTimeout(h: unknown): void {
    if (h === this.timeout) this.timeout = null
  }
  setInterval(): unknown {
    this.intervals++
    return this.intervals
  }
  clearInterval(): void {
    this.intervals--
  }
}

const at = (day: string, time: string): number => localInstant(day, time)
const TODAY = '2026-11-25'

function remind(
  id: string,
  dueDay: string,
  dueTime: string | null,
  option: RemindOption,
  title = id,
): void {
  notes.create({ id, title, color: 'stone' })
  notes.update(id, { dueDay, dueTime, remind: option })
}

/** Moves the clock and runs the check the armed timer (or the interval) would run. */
function advanceTo(ms: number): void {
  now = ms
  scheduler.check()
}

beforeEach(() => {
  process.env['TZ'] = 'Europe/London'
  handle = openDatabase(':memory:')
  now = at(TODAY, '09:00')
  notes = new NotesService({ db: () => handle, now: () => now })
  shown = []
  settings = defaultSettings()
  timers = new FakeTimers()
  scheduler = new ReminderScheduler({
    db: () => handle,
    now: () => now,
    notifier: { show: (t) => void shown.push(t) },
    settings: {
      get: <K extends SettingKey>(key: K) => settings[key],
      set: <K extends SettingKey>(key: K, value: Settings[K]) => void (settings[key] = value),
    },
    timers,
  })
})
afterEach(() => {
  scheduler.stop()
  handle.close()
})

describe('arming', () => {
  it('arms one timer for the soonest reminder, plus the 60s safety interval', () => {
    remind('late', TODAY, '15:00', 'at')
    remind('soon', TODAY, '11:00', '1h')
    scheduler.start()
    expect(timers.intervals).toBe(1)
    expect(scheduler.nextAt).toBe(at(TODAY, '10:00'))
    expect(timers.timeout?.ms).toBe(60 * 60_000)
    expect(shown).toEqual([])
  })

  it('caps the timer at a day', () => {
    remind('far', '2026-12-25', '09:00', 'at')
    scheduler.start()
    expect(timers.timeout?.ms).toBe(24 * 60 * 60_000)
  })

  it('arms nothing when nothing is pending', () => {
    scheduler.start()
    expect(scheduler.nextAt).toBeNull()
    expect(timers.timeout).toBeNull()
  })
})

describe('due reminders', () => {
  it('fires at its time, with the note and when it is due, and never twice', () => {
    remind('n1', TODAY, '15:00', 'at', 'Pay rent')
    scheduler.start()
    advanceTo(at(TODAY, '14:59'))
    expect(shown).toEqual([])
    timers.timeout?.fn() // the timer itself, still at 14:59: nothing yet
    advanceTo(at(TODAY, '15:00'))
    expect(shown).toEqual([
      { title: 'Pay rent', body: 'Due today at 15:00', link: 'sprawl://note/n1' },
    ])
    advanceTo(at(TODAY, '15:00') + 30_000)
    advanceTo(at(TODAY, '15:05'))
    expect(shown).toHaveLength(1)
    expect(notes.get('n1').remindedAt).toBe(at(TODAY, '15:00'))
  })

  it('says tomorrow for a reminder the day before, and names the next unticked item', () => {
    remind('n1', '2026-11-26', '10:00', '1d', 'Trip')
    notes.update('n1', {
      bodyJson: JSON.stringify([
        {
          type: 'checkListItem',
          props: { checked: true },
          content: [{ type: 'text', text: 'Book' }],
        },
        {
          type: 'checkListItem',
          props: { checked: false },
          content: [{ type: 'text', text: 'Pack' }],
        },
      ]),
    })
    scheduler.start()
    expect(shown.map((t) => t.body)).toEqual(['Due tomorrow at 10:00 · Next: Pack'])
  })

  it('is cancelled by marking the note done, and re-armed by changing the due date', () => {
    remind('n1', TODAY, '10:00', 'at')
    scheduler.start()
    notes.setDone('n1', true)
    scheduler.check()
    expect(scheduler.nextAt).toBeNull()
    advanceTo(at(TODAY, '10:00'))
    expect(shown).toEqual([])
    notes.setDone('n1', false)
    notes.update('n1', { dueTime: '11:00' })
    advanceTo(at(TODAY, '11:00'))
    expect(shown.map((t) => t.link)).toEqual(['sprawl://note/n1'])
  })

  it('skips deleted notes', () => {
    remind('n1', TODAY, '10:00', 'at')
    notes.remove('n1')
    scheduler.start()
    advanceTo(at(TODAY, '10:00'))
    expect(shown).toEqual([])
  })

  it('fires two reminders at the same time as two toasts', () => {
    remind('a', TODAY, '10:00', 'at')
    remind('b', TODAY, '10:00', 'at')
    scheduler.start()
    advanceTo(at(TODAY, '10:00'))
    expect(shown.map((t) => t.title)).toEqual(['a', 'b'])
  })

  it('with due reminders off, marks them without showing anything', () => {
    remind('n1', TODAY, '10:00', 'at')
    settings.remindersOn = false
    scheduler.start()
    advanceTo(at(TODAY, '10:00'))
    expect(shown).toEqual([])
    settings.remindersOn = true
    advanceTo(at(TODAY, '10:01'))
    expect(shown).toEqual([])
  })

  it('holds reminders during a pause and shows them when it ends', () => {
    remind('n1', TODAY, '10:00', 'at')
    settings.notificationsPausedUntil = at(TODAY, '10:30')
    scheduler.start()
    advanceTo(at(TODAY, '10:00'))
    expect(shown).toEqual([])
    expect(scheduler.nextAt).toBe(at(TODAY, '10:30'))
    advanceTo(at(TODAY, '10:30'))
    // Half an hour late: shown as itself, now overdue.
    expect(shown.map((t) => t.body)).toEqual(['Overdue since 10:00'])
  })
})

describe('missed reminders', () => {
  it('summarizes two or more missed ones in one toast', () => {
    remind('a', TODAY, '07:00', 'at')
    remind('b', TODAY, '08:00', '15m')
    remind('c', TODAY, '12:00', '1h')
    now = at(TODAY, '11:30') // Sprawl starts long after a and b
    scheduler.start()
    expect(shown).toEqual([
      {
        title: 'While you were away',
        body: '3 reminders · 2 now overdue',
        link: 'sprawl://list/due',
      },
    ])
    expect(notes.get('a').remindedAt).toBe(now)
    expect(notes.get('b').remindedAt).toBe(now)
    // c's 11:00 reminder was missed by 30 minutes too, but it isn't overdue yet.
    expect(notes.get('c').remindedAt).toBe(now)
  })

  it('shows a single missed reminder as itself', () => {
    remind('a', TODAY, '07:00', 'at', 'Call Ali')
    now = at(TODAY, '09:00')
    scheduler.start()
    expect(shown).toEqual([
      { title: 'Call Ali', body: 'Overdue since 07:00', link: 'sprawl://note/a' },
    ])
  })

  it('counts a reminder that fires within 2 minutes as on time', () => {
    remind('a', TODAY, '10:00', 'at')
    remind('b', TODAY, '10:00', 'at')
    scheduler.start()
    advanceTo(at(TODAY, '10:01')) // the PC was busy; still on time
    expect(shown.map((t) => t.title)).toEqual(['a', 'b'])
  })

  it('treats a wake from sleep like a late start', () => {
    remind('a', TODAY, '10:00', 'at')
    remind('b', TODAY, '10:30', 'at')
    scheduler.start()
    advanceTo(at(TODAY, '12:00')) // powerMonitor resume
    expect(shown.map((t) => t.title)).toEqual(['While you were away'])
  })
})

describe('overdue nudge', () => {
  it('nudges once when a reminded note becomes overdue', () => {
    remind('n1', TODAY, '15:00', '1h', 'Report')
    scheduler.start()
    advanceTo(at(TODAY, '14:00'))
    expect(scheduler.nextAt).toBe(at(TODAY, '15:00'))
    advanceTo(at(TODAY, '15:00'))
    advanceTo(at(TODAY, '15:30'))
    expect(shown.map((t) => t.body)).toEqual(['Due today at 15:00', 'Overdue since 15:00'])
  })

  it('never nudges after an "At due time" reminder, or a note without one', () => {
    remind('a', TODAY, '15:00', 'at')
    notes.create({ id: 'b', title: 'b', color: 'stone' })
    notes.update('b', { dueDay: TODAY, dueTime: '15:00' })
    scheduler.start()
    advanceTo(at(TODAY, '15:00'))
    advanceTo(at(TODAY, '16:00'))
    expect(shown.map((t) => t.title)).toEqual(['a'])
  })

  it('skips the nudge for a note marked done', () => {
    remind('n1', TODAY, '15:00', '1h')
    scheduler.start()
    advanceTo(at(TODAY, '14:00'))
    notes.setDone('n1', true)
    advanceTo(at(TODAY, '15:00'))
    expect(shown).toHaveLength(1)
  })
})

describe('morning summary', () => {
  beforeEach(() => {
    settings.morningSummary = { on: true, time: '09:00' }
    now = at(TODAY, '08:00')
  })

  it('counts what is due today and overdue, once a day, silently', () => {
    notes.create({ id: 'a', title: 'a', color: 'stone' })
    notes.update('a', { dueDay: TODAY })
    notes.create({ id: 'b', title: 'b', color: 'stone' })
    notes.update('b', { dueDay: '2026-11-24' })
    notes.create({ id: 'c', title: 'c', color: 'stone' })
    notes.update('c', { dueDay: '2026-11-26' })
    scheduler.start()
    expect(scheduler.nextAt).toBe(at(TODAY, '09:00'))
    advanceTo(at(TODAY, '09:00'))
    expect(shown).toEqual([
      {
        title: 'Today in Sprawl',
        body: '1 due today · 1 overdue',
        link: 'sprawl://list/due',
        silent: true,
      },
    ])
    expect(settings.morningSummarySentOn).toBe(TODAY)
    advanceTo(at(TODAY, '12:00'))
    expect(shown).toHaveLength(1)
    expect(scheduler.nextAt).toBe(at('2026-11-26', '09:00'))
  })

  it('is skipped when nothing is due or overdue', () => {
    scheduler.start()
    advanceTo(at(TODAY, '09:00'))
    expect(shown).toEqual([])
    expect(settings.morningSummarySentOn).toBe(TODAY)
  })

  it('goes out on a start later that day, and not at all when it is off', () => {
    notes.create({ id: 'a', title: 'a', color: 'stone' })
    notes.update('a', { dueDay: TODAY })
    settings.morningSummary = { on: false, time: '09:00' }
    now = at(TODAY, '10:00')
    scheduler.start()
    expect(shown).toEqual([])
    settings.morningSummary = { on: true, time: '09:00' }
    scheduler.check()
    expect(shown.map((t) => t.body)).toEqual(['1 due today'])
  })
})

describe('timezones', () => {
  it('re-derives pending reminder times on the first check', () => {
    remind('n1', TODAY, '15:00', 'at')
    handle.sqlite.prepare('UPDATE notes SET remind_at = 1 WHERE id = ?').run('n1')
    scheduler.start()
    expect(notes.get('n1').remindAt).toBe(at(TODAY, '15:00'))
    expect(shown).toEqual([])
  })

  it('follows a timezone change: the wall-clock time stays', () => {
    remind('n1', TODAY, '15:00', 'at')
    scheduler.start()
    process.env['TZ'] = 'Asia/Tokyo'
    scheduler.check()
    expect(notes.get('n1').remindAt).toBe(localInstant(TODAY, '15:00'))
    expect(notes.get('n1').remindAt).not.toBe(Date.UTC(2026, 10, 25, 15))
  })
})

describe('toast text', () => {
  it('words reminders, summaries and the away summary', () => {
    const t = at(TODAY, '09:00')
    expect(reminderBody(TODAY, null, null, t)).toBe('Due today')
    expect(reminderBody('2026-11-28', '15:00', null, t)).toBe('Due Sat 28 Nov at 15:00')
    expect(reminderBody('2026-11-23', null, null, t)).toBe('Overdue since Mon')
    expect(reminderBody('2026-11-02', null, 'x', t)).toBe('Overdue since 2 Nov · Next: x')
    expect(morningBody(3, 1)).toBe('3 due today · 1 overdue')
    expect(morningBody(0, 2)).toBe('2 overdue')
    expect(awayBody(1, 0)).toBe('1 reminder')
    expect(awayBody(0, 1)).toBe('1 note now overdue')
  })
})
