import { describe, expect, it } from 'vitest'
import { nudgeTime, parseTime } from '../../../../src/renderer/lib/time'

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
