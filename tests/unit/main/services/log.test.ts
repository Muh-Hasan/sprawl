import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { CanvasService } from '../../../../src/main/services/canvas'
import { countStreak, LogService } from '../../../../src/main/services/log'
import { NotesService, purgeDeleted, PURGE_AFTER_MS } from '../../../../src/main/services/notes'
import { dayKey, localInstant } from '../../../../src/shared/due'

// Day keys are local: run in a timezone with DST, and switch zones where a test says so.
// Node re-reads TZ whenever it's assigned.
const savedTz = process.env['TZ']
process.env['TZ'] = 'Europe/London'
afterAll(() => {
  if (savedTz === undefined) delete process.env['TZ']
  else process.env['TZ'] = savedTz
})

let handle: DbHandle
let now = 0
let notes: NotesService
let log: LogService
let canvas: CanvasService

beforeEach(() => {
  process.env['TZ'] = 'Europe/London'
  handle = openDatabase(':memory:')
  now = localInstant('2026-11-25', '10:00')
  const deps = { db: () => handle, now: () => now }
  notes = new NotesService(deps)
  log = new LogService(deps)
  canvas = new CanvasService(deps)
  notes.create({ id: 'n1', title: 'Call the bank', color: 'sage' })
})
afterEach(() => handle.close())

const count = (table: string, where = '1'): number =>
  handle.sqlite.prepare(`SELECT count(*) FROM ${table} WHERE ${where}`).pluck().get() as number

describe('day keys', () => {
  it('follows the local day across midnight', () => {
    expect(dayKey(localInstant('2026-11-25', '23:59') + 59_999)).toBe('2026-11-25')
    expect(dayKey(localInstant('2026-11-26', '00:00'))).toBe('2026-11-26')
  })

  it('gives one instant different days in different timezones', () => {
    const instant = Date.UTC(2026, 10, 25, 23, 30) // 23:30 in London
    expect(dayKey(instant)).toBe('2026-11-25')
    process.env['TZ'] = 'Asia/Tokyo'
    expect(dayKey(instant)).toBe('2026-11-26')
    process.env['TZ'] = 'America/Los_Angeles'
    expect(dayKey(instant)).toBe('2026-11-25')
  })

  it('keeps the day through the DST changes', () => {
    // 29 Mar 2026: clocks go 01:00 → 02:00; 25 Oct 2026: 02:00 → 01:00.
    expect(dayKey(Date.UTC(2026, 2, 28, 23, 59))).toBe('2026-03-28')
    expect(dayKey(Date.UTC(2026, 2, 29, 0, 0))).toBe('2026-03-29')
    expect(dayKey(Date.UTC(2026, 2, 29, 22, 59))).toBe('2026-03-29') // 23:59 BST
    expect(dayKey(Date.UTC(2026, 2, 29, 23, 0))).toBe('2026-03-30') // 00:00 BST
    expect(dayKey(Date.UTC(2026, 9, 24, 23, 0))).toBe('2026-10-25') // 00:00 BST
    expect(dayKey(Date.UTC(2026, 9, 25, 23, 59))).toBe('2026-10-25') // 23:59 GMT
  })

  it('logs a note done just before midnight on that day, and just after on the next', () => {
    notes.create({ id: 'n2', title: 'Late', color: 'stone' })
    now = localInstant('2026-11-25', '23:59') + 59_000
    notes.setDone('n1', true)
    now = localInstant('2026-11-26', '00:00') + 1_000
    notes.setDone('n2', true)
    expect(log.day('2026-11-25').entries.map((e) => e.noteId)).toEqual(['n1'])
    expect(log.day('2026-11-26').entries.map((e) => e.noteId)).toEqual(['n2'])
  })

  it("logs on the local day of the timezone it's marked done in", () => {
    process.env['TZ'] = 'Asia/Tokyo'
    now = Date.UTC(2026, 10, 25, 20, 0) // 05:00 on the 26th in Tokyo
    notes.setDone('n1', true)
    expect(log.day('2026-11-26').entries).toHaveLength(1)
    expect(log.day('2026-11-25').entries).toHaveLength(0)
  })
})

describe('mark done and undo done', () => {
  it('sets done_at and adds one done entry with a title snapshot, in one go', () => {
    const note = notes.setDone('n1', true)
    expect(note.doneAt).toBe(now)
    const [entry, ...rest] = log.day('2026-11-25').entries
    expect(rest).toEqual([])
    expect(entry).toMatchObject({
      kind: 'done',
      at: now,
      day: '2026-11-25',
      text: 'Call the bank',
      noteId: 'n1',
      note: { title: 'Call the bank', color: 'sage' },
    })
  })

  it('marking a done note done again changes nothing', () => {
    notes.setDone('n1', true)
    now += 60_000
    expect(notes.setDone('n1', true).doneAt).toBe(now - 60_000)
    expect(count('log_entries')).toBe(1)
  })

  it('undo done removes its entry and clears done_at, leaving no orphan rows', () => {
    notes.create({ id: 'n2', title: 'Other', color: 'stone' })
    notes.setDone('n2', true)
    log.addManual('2026-11-25', 'Lunch')
    notes.setDone('n1', true)
    const note = notes.setDone('n1', false)
    expect(note.doneAt).toBeNull()
    expect(count('log_entries', "note_id = 'n1'")).toBe(0)
    expect(count('log_entries')).toBe(2) // n2's entry and the manual one stay
    expect(count('notes', 'done_at IS NOT NULL')).toBe(1)
  })

  it('done → undo → done again gives one entry, at the new time', () => {
    notes.setDone('n1', true)
    notes.setDone('n1', false)
    now += 5 * 60_000
    notes.setDone('n1', true)
    const entries = log.day('2026-11-25').entries
    expect(entries).toHaveLength(1)
    expect(entries[0]!.at).toBe(now)
  })

  it('undoing done on a later day removes the entry from the day it was done', () => {
    notes.setDone('n1', true)
    now = localInstant('2026-11-27', '09:00')
    notes.setDone('n1', false)
    expect(count('log_entries')).toBe(0)
  })

  it('refuses a missing or deleted note, and changes nothing', () => {
    expect(() => notes.setDone('nope', true)).toThrow(/missing note/)
    notes.remove('n1')
    expect(() => notes.setDone('n1', true)).toThrow(/missing note/)
    expect(count('log_entries')).toBe(0)
  })

  it('re-arms a reminder that is still ahead when undone', () => {
    notes.update('n1', { dueDay: '2026-11-26', dueTime: '15:00', remind: 'at' })
    notes.setDone('n1', true)
    const note = notes.setDone('n1', false)
    expect(note.remindAt).toBe(localInstant('2026-11-26', '15:00'))
    expect(note.remindedAt).toBeNull()
  })

  it("doesn't fire a reminder that came due while the note was done", () => {
    notes.update('n1', { dueDay: '2026-11-25', dueTime: '12:00', remind: 'at' })
    notes.setDone('n1', true)
    now = localInstant('2026-11-25', '13:00')
    const note = notes.setDone('n1', false)
    expect(note.remindedAt).toBe(now)
  })
})

describe('done entries and their note', () => {
  it('show the live title and color, with the snapshot kept', () => {
    notes.setDone('n1', true)
    notes.update('n1', { title: 'Called the bank', color: 'rose' })
    const [entry] = log.day('2026-11-25').entries
    expect(entry).toMatchObject({
      text: 'Call the bank',
      note: { title: 'Called the bank', color: 'rose' },
    })
  })

  it('fall back to the snapshot once the note is deleted, then purged', () => {
    notes.setDone('n1', true)
    notes.remove('n1')
    expect(log.day('2026-11-25').entries[0]).toMatchObject({ note: null, noteId: 'n1' })
    purgeDeleted(handle, now + PURGE_AFTER_MS + 1)
    expect(log.day('2026-11-25').entries[0]).toMatchObject({
      note: null,
      noteId: null,
      text: 'Call the bank',
    })
  })
})

describe('the setDone canvas op', () => {
  const card = {
    id: 'c1',
    kind: 'note' as const,
    refId: 'n9',
    url: null,
    title: null,
    x: 0,
    y: 0,
    w: 220,
    h: 64,
    z: 1,
  }

  beforeEach(() => {
    canvas.apply([{ op: 'create', item: card, note: { id: 'n9', title: 'Ship', color: 'sky' } }])
  })

  it('marks the card note done with its log entry, and the card shows doneAt', () => {
    canvas.apply([{ op: 'setDone', id: 'c1', done: true }])
    expect(canvas.load()[0]!.note?.doneAt).toBe(now)
    expect(log.day('2026-11-25').entries.map((e) => e.text)).toEqual(['Ship'])
  })

  it('round trips with undo (setDone false) and leaves no orphans', () => {
    canvas.apply([{ op: 'setDone', id: 'c1', done: true }])
    canvas.apply([{ op: 'setDone', id: 'c1', done: false }])
    expect(canvas.load()[0]!.note?.doneAt).toBeNull()
    expect(count('log_entries')).toBe(0)
  })

  it('is a no-op for a card that is gone, and fails (rolling back) on another kind', () => {
    canvas.apply([{ op: 'setDone', id: 'gone', done: true }])
    canvas.apply([
      {
        op: 'create',
        item: { ...card, id: 'l1', kind: 'link', refId: null, url: 'https://a.b', z: 2 },
      },
    ])
    expect(() =>
      canvas.apply([
        { op: 'setDone', id: 'c1', done: true },
        { op: 'setDone', id: 'l1', done: true },
      ]),
    ).toThrow(/Only note cards/)
    expect(count('log_entries')).toBe(0)
    expect(count('notes', 'done_at IS NOT NULL')).toBe(0)
  })

  it('deleting a done card and restoring it keeps the note done', () => {
    canvas.apply([{ op: 'setDone', id: 'c1', done: true }])
    canvas.apply([{ op: 'delete', id: 'c1' }])
    canvas.apply([{ op: 'restore', item: card }])
    expect(canvas.load()[0]!.note?.doneAt).toBe(now)
    expect(count('log_entries')).toBe(1)
  })
})

describe('manual entries', () => {
  it('are added at now on today', () => {
    const entry = log.addManual('2026-11-25', 'Called the bank')
    expect(entry).toMatchObject({ kind: 'manual', at: now, text: 'Called the bank', note: null })
  })

  it('on another day, take the current time of day', () => {
    const entry = log.addManual('2026-11-20', 'Forgot to log this')
    expect(entry.at).toBe(localInstant('2026-11-20', '10:00'))
  })

  it('refuse a time that is not on their day', () => {
    expect(() => log.addManual('2026-11-20', 'x', now)).toThrow(/isn't on 2026-11-20/)
  })

  it('sort by time, and edit their text and time on the same day', () => {
    const a = log.addManual('2026-11-25', 'Second')
    const b = log.addManual('2026-11-25', 'First', localInstant('2026-11-25', '08:00'))
    expect(log.day('2026-11-25').entries.map((e) => e.id)).toEqual([b.id, a.id])
    const edited = log.update(b.id, { text: 'Third', time: '18:30' })
    expect(edited).toMatchObject({ text: 'Third', at: localInstant('2026-11-25', '18:30') })
    expect(log.day('2026-11-25').entries.map((e) => e.id)).toEqual([a.id, b.id])
  })

  it('are deleted; done entries can be neither edited nor deleted', () => {
    const a = log.addManual('2026-11-25', 'Oops')
    log.remove(a.id)
    expect(count('log_entries')).toBe(0)
    notes.setDone('n1', true)
    const done = log.day('2026-11-25').entries[0]!
    expect(() => log.update(done.id, { text: 'x' })).toThrow(/Only manual/)
    expect(() => log.remove(done.id)).toThrow(/Only manual/)
    expect(() => log.remove('missing')).toThrow(/No such log entry/)
  })
})

describe('days with entries', () => {
  it('lists the days of one month that have entries, once each', () => {
    log.addManual('2026-11-03', 'a')
    log.addManual('2026-11-03', 'b')
    log.addManual('2026-11-25', 'c')
    log.addManual('2026-10-31', 'd')
    log.addManual('2026-12-01', 'e')
    expect(log.daysWithEntries('2026-11')).toEqual(['2026-11-03', '2026-11-25'])
    expect(log.daysWithEntries('2026-09')).toEqual([])
  })
})

describe('streak', () => {
  it('counts the run of days ending on the given day', () => {
    const days = ['2026-11-25', '2026-11-24', '2026-11-23', '2026-11-21', '2026-11-20']
    expect(countStreak(days, '2026-11-25')).toBe(3)
    expect(countStreak(days, '2026-11-21')).toBe(0) // not the newest day given
    expect(countStreak(days.slice(3), '2026-11-21')).toBe(2)
    expect(countStreak([], '2026-11-25')).toBe(0)
  })

  it('is 0 for a day with no entries, unless that day is today', () => {
    const days = ['2026-11-24', '2026-11-23']
    expect(countStreak(days, '2026-11-25')).toBe(0)
    expect(countStreak(days, '2026-11-25', true)).toBe(2)
    expect(countStreak(['2026-11-23'], '2026-11-25', true)).toBe(0)
  })

  it('crosses months and years', () => {
    expect(countStreak(['2027-01-01', '2026-12-31', '2026-12-30'], '2027-01-01')).toBe(3)
    expect(countStreak(['2026-03-01', '2026-02-28'], '2026-03-01')).toBe(2)
  })

  it('reads the log from the database, ignoring later days', () => {
    for (const day of ['2026-11-22', '2026-11-23', '2026-11-24', '2026-11-26']) {
      log.addManual(day, 'x')
      log.addManual(day, 'y')
    }
    // Today (the 25th) has nothing yet: the run up to yesterday still counts.
    expect(log.streak('2026-11-25')).toBe(3)
    expect(log.streak('2026-11-23')).toBe(2)
    expect(log.streak('2026-11-21')).toBe(0)
    notes.setDone('n1', true) // a done entry counts too
    expect(log.streak('2026-11-25')).toBe(4)
  })
})

describe('carried over', () => {
  const activity = (noteId: string, day: string): void => {
    handle.sqlite.prepare('INSERT INTO note_activity (note_id, day) VALUES (?, ?)').run(noteId, day)
  }

  beforeEach(() => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f'])
      notes.create({ id, title: id.toUpperCase(), color: 'stone' })
    activity('a', '2026-11-24') // edited yesterday, still open
    activity('b', '2026-11-24') // edited yesterday, done today
    activity('c', '2026-11-24') // edited yesterday, deleted
    activity('d', '2026-11-25') // edited today only
    activity('e', '2026-11-23') // edited the day before yesterday
    activity('f', '2026-11-24') // edited yesterday, done yesterday
    notes.setDone('b', true)
    notes.remove('c')
    now = localInstant('2026-11-24', '17:00')
    notes.setDone('f', true)
  })

  it("lists yesterday's edited notes that are still open today", () => {
    expect(log.carriedOver('2026-11-25').map((n) => n.id)).toEqual(['a'])
  })

  it('on a past day, counts notes done only after that day as still open then', () => {
    // Viewing the 24th: edited on the 23rd and not done by the end of the 24th.
    activity('b', '2026-11-23')
    activity('f', '2026-11-23')
    expect(
      log
        .carriedOver('2026-11-24')
        .map((n) => n.id)
        .sort(),
    ).toEqual(['b', 'e'])
  })

  it('gives the title and color for the row', () => {
    expect(log.carriedOver('2026-11-25')[0]).toEqual({ id: 'a', title: 'A', color: 'stone' })
  })
})
