import { describe, expect, it } from 'vitest'
import { monthsOf, stepDay, stripDays } from '../../../../../src/renderer/views/log/days'

describe('the week strip', () => {
  it('shows the last 7 days while the selected day is among them', () => {
    const days = stripDays('2026-11-22', '2026-11-25')
    expect(days).toEqual([
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
    ])
    expect(stripDays('2026-11-19', '2026-11-25')).toEqual(days)
  })

  it('ends on the selected day once it is further back, across months', () => {
    expect(stripDays('2026-11-18', '2026-11-25')).toEqual([
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ])
    expect(stripDays('2026-03-02', '2026-11-25').slice(0, 2)).toEqual(['2026-02-24', '2026-02-25'])
  })

  it('lists the months a set of days touches', () => {
    expect(monthsOf(stripDays('2026-03-02', '2026-11-25'))).toEqual(['2026-02', '2026-03'])
  })
})

describe('stepping days', () => {
  it('goes back freely, and forward up to today', () => {
    expect(stepDay('2026-11-25', -1, '2026-11-25')).toBe('2026-11-24')
    expect(stepDay('2026-03-01', -1, '2026-11-25')).toBe('2026-02-28')
    expect(stepDay('2026-11-24', 1, '2026-11-25')).toBe('2026-11-25')
    expect(stepDay('2026-11-25', 1, '2026-11-25')).toBe('2026-11-25')
  })
})
