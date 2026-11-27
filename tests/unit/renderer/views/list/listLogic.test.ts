import { describe, expect, it } from 'vitest'
import { localInstant } from '../../../../../src/shared/due'
import type { NoteListRow } from '../../../../../src/shared/types'
import {
  countLabel,
  doneLabel,
  dueGroupOf,
  editedLabel,
  groupByDue,
  leavesTab,
} from '../../../../../src/renderer/views/list/listLogic'

// Wednesday 25 November 2026, in the machine's timezone (no DST change near it).
const WED = (time = '10:00'): number => localInstant('2026-11-25', time)

function row(id: string, dueDay: string | null, dueTime: string | null = null): NoteListRow {
  return {
    id,
    title: id,
    color: 'stone',
    firstLine: '',
    checkTotal: 0,
    checkDone: 0,
    linkCount: 0,
    dueDay,
    dueTime,
    doneAt: null,
    pinnedAt: null,
    createdAt: 0,
    updatedAt: 0,
    onCanvas: true,
  }
}

describe('dueGroupOf', () => {
  it('puts each due date in its group: Overdue, Today, Tomorrow, This week (to Sunday), Later', () => {
    expect(dueGroupOf('2026-11-24', null, WED())).toBe('overdue')
    expect(dueGroupOf('2026-11-25', '09:00', WED())).toBe('overdue')
    expect(dueGroupOf('2026-11-25', '11:00', WED())).toBe('today')
    expect(dueGroupOf('2026-11-25', null, WED())).toBe('today')
    expect(dueGroupOf('2026-11-26', null, WED())).toBe('tomorrow')
    expect(dueGroupOf('2026-11-27', null, WED())).toBe('week')
    expect(dueGroupOf('2026-11-29', null, WED())).toBe('week') // Sunday
    expect(dueGroupOf('2026-11-30', null, WED())).toBe('later') // next Monday
  })

  it('has no "This week" left on a Saturday', () => {
    const sat = localInstant('2026-11-28', '10:00')
    expect(dueGroupOf('2026-11-29', null, sat)).toBe('tomorrow')
    expect(dueGroupOf('2026-11-30', null, sat)).toBe('later')
  })
})

describe('groupByDue', () => {
  it('groups in order, keeps the row order and hides empty groups', () => {
    const rows = [
      row('a', '2026-11-20'),
      row('b', '2026-11-25', '09:00'),
      row('c', '2026-11-25', '15:00'),
      row('d', '2026-12-10'),
    ]
    expect(groupByDue(rows, WED()).map((g) => [g.group, g.rows.map((r) => r.id)])).toEqual([
      ['overdue', ['a', 'b']],
      ['today', ['c']],
      ['later', ['d']],
    ])
  })
})

describe('row labels', () => {
  it('words the edited time', () => {
    const now = WED()
    expect(editedLabel(now - 20_000, now)).toBe('now')
    expect(editedLabel(now - 5 * 60_000, now)).toBe('5m ago')
    expect(editedLabel(now - 2 * 3600_000, now)).toBe('2h ago')
    expect(editedLabel(localInstant('2026-11-22', '23:00'), now)).toBe('3d ago')
    expect(editedLabel(localInstant('2026-11-12', '10:00'), now)).toBe('12 Nov')
    expect(editedLabel(localInstant('2025-11-12', '10:00'), now)).toBe('12 Nov 25')
  })

  it('words the done time', () => {
    expect(doneLabel(WED('08:05'), WED())).toBe('08:05')
    expect(doneLabel(localInstant('2026-11-23', '18:00'), WED())).toBe('Mon')
    expect(doneLabel(localInstant('2026-11-02', '18:00'), WED())).toBe('2 Nov')
  })

  it('counts per tab', () => {
    expect(countLabel('open', 24)).toBe('24 open')
    expect(countLabel('due', 1)).toBe('1 due')
    expect(countLabel('done', 3)).toBe('3 done')
    expect(countLabel('all', 1)).toBe('1 note')
    expect(countLabel('all', 40)).toBe('40 notes')
  })

  it('knows when a ticked row leaves its tab', () => {
    expect(leavesTab('open', true)).toBe(true)
    expect(leavesTab('due', true)).toBe(true)
    expect(leavesTab('done', false)).toBe(true)
    expect(leavesTab('done', true)).toBe(false)
    expect(leavesTab('all', true)).toBe(false)
  })
})
