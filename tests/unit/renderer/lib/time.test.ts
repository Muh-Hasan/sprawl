import { describe, expect, it } from 'vitest'
import { editedLabel, nudgeTime, parseTime } from '../../../../src/renderer/lib/time'

describe('parseTime', () => {
  it('reads the ways people type a time', () => {
    expect(parseTime('9')).toBe('09:00')
    expect(parseTime('930')).toBe('09:30')
    expect(parseTime('0930')).toBe('09:30')
    expect(parseTime('9:30')).toBe('09:30')
    expect(parseTime('9.30')).toBe('09:30')
    expect(parseTime(' 23:59 ')).toBe('23:59')
    expect(parseTime('1545')).toBe('15:45')
  })

  it('refuses what is not a time', () => {
    for (const bad of ['', '24', '2400', '9:60', '12345', 'noon', '9:3', '-1']) {
      expect(parseTime(bad)).toBeNull()
    }
  })
})

describe('nudgeTime', () => {
  it('steps by a quarter hour', () => {
    expect(nudgeTime('09:00', 1)).toBe('09:15')
    expect(nudgeTime('09:00', -1)).toBe('08:45')
  })

  it('snaps an off-grid time to the grid in the direction of the step', () => {
    expect(nudgeTime('09:10', 1)).toBe('09:15')
    expect(nudgeTime('09:10', -1)).toBe('09:00')
  })

  it('wraps around midnight', () => {
    expect(nudgeTime('23:45', 1)).toBe('00:00')
    expect(nudgeTime('00:00', -1)).toBe('23:45')
  })
})

describe('editedLabel', () => {
  const now = new Date(2026, 10, 27, 15, 30).getTime()
  const at = (...args: [number, number, number, number, number]) => new Date(...args).getTime()

  it('reads "just now" under a minute, even a little in the future', () => {
    expect(editedLabel(now - 59_000, now)).toBe('Edited just now')
    expect(editedLabel(now + 2_000, now)).toBe('Edited just now')
  })

  it('counts minutes under an hour', () => {
    expect(editedLabel(now - 60_000, now)).toBe('Edited 1 min ago')
    expect(editedLabel(now - 59 * 60_000, now)).toBe('Edited 59 min ago')
  })

  it('shows the time today, then yesterday, then the date', () => {
    expect(editedLabel(at(2026, 10, 27, 9, 5), now)).toBe('Edited 09:05')
    expect(editedLabel(at(2026, 10, 26, 23, 50), now)).toBe('Edited yesterday')
    expect(editedLabel(at(2026, 10, 3, 12, 0), now)).toBe('Edited 3 Nov')
    expect(editedLabel(at(2025, 11, 31, 12, 0), now)).toBe('Edited 31 Dec 2025')
  })
})
