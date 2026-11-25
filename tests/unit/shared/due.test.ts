import { afterAll, describe, expect, it } from 'vitest'
import {
  deriveRemindAt,
  dueChipLabel,
  dueLongLabel,
  dueState,
  normalizeDue,
  reminderLabel,
  shiftDay,
  type DueFields,
} from '../../../src/shared/due'

// A timezone with DST, so the day boundaries and clock changes are real. Node re-reads TZ
// when it's assigned. Set at load, before any test (or describe body) makes a date.
const savedTz = process.env['TZ']
process.env['TZ'] = 'Europe/London'
afterAll(() => {
  if (savedTz === undefined) delete process.env['TZ']
  else process.env['TZ'] = savedTz
})

/** A London wall-clock instant. */
const local = (y: number, mo: number, d: number, h = 0, mi = 0) =>
  new Date(y, mo - 1, d, h, mi).getTime()

const due = (dueDay: string | null, dueTime: string | null, remind: DueFields['remind']) => ({
  dueDay,
  dueTime,
  remind,
})

describe('deriveRemindAt', () => {
  it('handles every option in winter (GMT = UTC)', () => {
    expect(deriveRemindAt(due('2026-12-01', '15:00', 'at'))).toBe(Date.UTC(2026, 11, 1, 15))
    expect(deriveRemindAt(due('2026-12-01', '15:00', '15m'))).toBe(Date.UTC(2026, 11, 1, 14, 45))
    expect(deriveRemindAt(due('2026-12-01', '15:00', '1h'))).toBe(Date.UTC(2026, 11, 1, 14))
    expect(deriveRemindAt(due('2026-12-01', '15:00', 'morning'))).toBe(Date.UTC(2026, 11, 1, 9))
    expect(deriveRemindAt(due('2026-12-01', '15:00', '1d'))).toBe(Date.UTC(2026, 10, 30, 9))
    expect(deriveRemindAt(due('2026-12-01', '15:00', 'none'))).toBeNull()
  })

  it('uses the local timezone in summer (BST = UTC+1)', () => {
    expect(deriveRemindAt(due('2026-07-10', '15:00', 'at'))).toBe(Date.UTC(2026, 6, 10, 14))
    expect(deriveRemindAt(due('2026-07-10', null, 'morning'))).toBe(Date.UTC(2026, 6, 10, 8))
  })

  it('morning and 1 day before work without a time; the others need one', () => {
    expect(deriveRemindAt(due('2026-12-01', null, 'morning'))).toBe(Date.UTC(2026, 11, 1, 9))
    expect(deriveRemindAt(due('2026-12-01', null, '1d'))).toBe(Date.UTC(2026, 10, 30, 9))
    for (const remind of ['at', '15m', '1h'] as const)
      expect(deriveRemindAt(due('2026-12-01', null, remind))).toBeNull()
  })

  it('is null without a due day', () => {
    expect(deriveRemindAt(due(null, null, 'morning'))).toBeNull()
  })

  it('counts real time back across the spring-forward change', () => {
    // 29 Mar 2026: 01:00 GMT jumps to 02:00 BST. 03:00 BST is 02:00 UTC; an hour before is
    // 01:00 UTC (00:59:59 GMT + 1s), not "02:00 local", which doesn't exist.
    expect(deriveRemindAt(due('2026-03-29', '03:00', '1h'))).toBe(Date.UTC(2026, 2, 29, 1))
    expect(deriveRemindAt(due('2026-03-29', '03:00', '15m'))).toBe(Date.UTC(2026, 2, 29, 1, 45))
    // 09:00 is BST on the 29th and GMT the day before.
    expect(deriveRemindAt(due('2026-03-29', null, 'morning'))).toBe(Date.UTC(2026, 2, 29, 8))
    expect(deriveRemindAt(due('2026-03-29', null, '1d'))).toBe(Date.UTC(2026, 2, 28, 9))
  })

  it('keeps 09:00 local across the autumn change', () => {
    // 25 Oct 2026: BST ends. The day before is still BST.
    expect(deriveRemindAt(due('2026-10-26', null, '1d'))).toBe(Date.UTC(2026, 9, 25, 9))
    expect(deriveRemindAt(due('2026-10-25', null, '1d'))).toBe(Date.UTC(2026, 9, 24, 8))
  })
})

describe('normalizeDue', () => {
  it('resets a reminder that needs a time when the time is cleared', () => {
    for (const remind of ['at', '15m', '1h'] as const)
      expect(normalizeDue(due('2026-12-01', null, remind))).toEqual(due('2026-12-01', null, 'none'))
  })

  it('keeps the morning reminders without a time', () => {
    expect(normalizeDue(due('2026-12-01', null, '1d')).remind).toBe('1d')
  })

  it('clears the time and reminder with the day', () => {
    expect(normalizeDue(due(null, '15:00', 'at'))).toEqual(due(null, null, 'none'))
  })
})

describe('dueState', () => {
  it('a day without a time is overdue only once the day is over', () => {
    expect(dueState('2026-12-01', null, local(2026, 12, 1, 23, 59))).toBe('soon')
    expect(dueState('2026-12-01', null, local(2026, 12, 2, 0, 0))).toBe('overdue')
  })

  it('a time makes it overdue from that minute', () => {
    expect(dueState('2026-12-01', '15:00', local(2026, 12, 1, 14, 59))).toBe('soon')
    expect(dueState('2026-12-01', '15:00', local(2026, 12, 1, 15, 0))).toBe('overdue')
  })

  it('is soon from 2 days before, and later before that', () => {
    expect(dueState('2026-12-01', null, local(2026, 11, 28, 23, 59))).toBe('later')
    expect(dueState('2026-12-01', null, local(2026, 11, 29, 0, 0))).toBe('soon')
    expect(dueState('2026-12-01', '09:00', local(2026, 11, 29, 0, 0))).toBe('soon')
  })
})

describe('labels', () => {
  const now = local(2026, 11, 25, 12) // a Wednesday

  it('names the card chip by distance', () => {
    expect(dueChipLabel('2026-11-25', now)).toBe('Today')
    expect(dueChipLabel('2026-11-26', now)).toBe('Tomorrow')
    expect(dueChipLabel('2026-11-24', now)).toBe('Yesterday')
    expect(dueChipLabel('2026-11-27', now)).toBe('Fri')
    expect(dueChipLabel('2026-12-01', now)).toBe('Tue')
    expect(dueChipLabel('2026-12-02', now)).toBe('2 Dec')
    expect(dueChipLabel('2026-11-20', now)).toBe('20 Nov')
    expect(dueChipLabel('2027-01-12', now)).toBe('12 Jan 2027')
  })

  it('formats the panel chip with and without a time', () => {
    expect(dueLongLabel('2026-11-28', null)).toBe('Sat 28 Nov')
    expect(dueLongLabel('2026-11-28', '15:00')).toBe('Sat 28 Nov · 15:00')
  })

  it('says when a reminder fires', () => {
    expect(reminderLabel(local(2026, 11, 25, 18), now)).toBe('today 18:00')
    expect(reminderLabel(local(2026, 11, 26, 9), now)).toBe('tomorrow 09:00')
    expect(reminderLabel(local(2026, 11, 27, 14, 45), now)).toBe('Fri 14:45')
    expect(reminderLabel(local(2026, 12, 12, 9), now)).toBe('12 Dec 09:00')
  })

  it('shifts day keys across months and years', () => {
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDay('2026-03-29', 1)).toBe('2026-03-30')
  })
})
