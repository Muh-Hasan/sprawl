import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { localInstant } from '../../../src/shared/due'
import { parseCapture, resolveDateWord, splitCapture } from '../../../src/shared/parseCapture'

const savedTz = process.env['TZ']
beforeEach(() => void (process.env['TZ'] = 'Europe/London'))
afterAll(() => {
  if (savedTz === undefined) delete process.env['TZ']
  else process.env['TZ'] = savedTz
})

// Wednesday 25 November 2026, 10:00.
const WED = (): number => localInstant('2026-11-25', '10:00')

describe('parseCapture: today and tomorrow', () => {
  it('reads !today and !tomorrow, and takes the token out', () => {
    expect(parseCapture('Pay rent !today', WED())).toEqual({
      text: 'Pay rent',
      due: { day: '2026-11-25', time: null },
      token: { start: 9, end: 15 },
    })
    expect(parseCapture('!tomorrow call Ali', WED()).text).toBe('call Ali')
    expect(parseCapture('!tomorrow call Ali', WED()).due).toEqual({ day: '2026-11-26', time: null })
  })

  it('takes a time after the token', () => {
    const p = parseCapture('Call Ali !tomorrow 15:00', WED())
    expect(p.text).toBe('Call Ali')
    expect(p.due).toEqual({ day: '2026-11-26', time: '15:00' })
    expect(p.token).toEqual({ start: 9, end: 24 })
  })

  it('pads a one-digit hour', () => {
    expect(parseCapture('x !today 9:30', WED()).due).toEqual({ day: '2026-11-25', time: '09:30' })
  })

  it('keeps a time that is not one in the text, and still takes the date', () => {
    const p = parseCapture('Gym !today 25:00', WED())
    expect(p.due).toEqual({ day: '2026-11-25', time: null })
    expect(p.text).toBe('Gym 25:00')
  })

  it('removes the token from the middle without a double space', () => {
    expect(parseCapture('Pay !fri 10:00 the rent', WED()).text).toBe('Pay the rent')
  })

  it('ignores case', () => {
    expect(parseCapture('x !TOMORROW', WED()).due?.day).toBe('2026-11-26')
    expect(parseCapture('x !Fri', WED()).due?.day).toBe('2026-11-27')
  })
})

describe('parseCapture: weekdays', () => {
  it('means the next one, 1 to 7 days ahead', () => {
    const day = (word: string): string | null => parseCapture(`x !${word}`, WED()).due?.day ?? null
    expect(day('thu')).toBe('2026-11-26')
    expect(day('fri')).toBe('2026-11-27')
    expect(day('sat')).toBe('2026-11-28')
    expect(day('sun')).toBe('2026-11-29')
    expect(day('mon')).toBe('2026-11-30')
    expect(day('tue')).toBe('2026-12-01')
  })

  it('never means today: the same weekday is a week ahead', () => {
    expect(parseCapture('x !wed', WED()).due?.day).toBe('2026-12-02')
    expect(parseCapture('x !wednesday', WED()).due?.day).toBe('2026-12-02')
  })

  it('takes full names and common short forms', () => {
    for (const w of ['friday', 'fri']) expect(resolveDateWord(w, '2026-11-25')).toBe('2026-11-27')
    for (const w of ['thursday', 'thurs', 'thur', 'thu'])
      expect(resolveDateWord(w, '2026-11-25')).toBe('2026-11-26')
    expect(resolveDateWord('tues', '2026-11-25')).toBe('2026-12-01')
  })

  it('reads "!fri 15:00" (the example in the spec)', () => {
    expect(parseCapture('Pay rent !fri 10:00', WED())).toMatchObject({
      text: 'Pay rent',
      due: { day: '2026-11-27', time: '10:00' },
    })
  })
})

describe('parseCapture: dates', () => {
  it('reads !12dec and !dec12 as this year', () => {
    expect(parseCapture('x !12dec', WED()).due?.day).toBe('2026-12-12')
    expect(parseCapture('x !dec12', WED()).due?.day).toBe('2026-12-12')
    expect(parseCapture('x !1december', WED()).due?.day).toBe('2026-12-01')
    expect(parseCapture('x !sept3', WED()).due?.day).toBe('2027-09-03')
  })

  it('means next year once the date has passed, but today is still this year', () => {
    expect(parseCapture('x !3mar', WED()).due?.day).toBe('2027-03-03')
    expect(parseCapture('x !24nov', WED()).due?.day).toBe('2027-11-24')
    expect(parseCapture('x !25nov', WED()).due?.day).toBe('2026-11-25')
  })

  it('handles a leap day: the next 29 Feb that exists', () => {
    expect(resolveDateWord('29feb', '2026-11-25')).toBeNull() // Feb 2027 has no 29th
    expect(resolveDateWord('29feb', '2027-03-01')).toBe('2028-02-29')
  })

  it('rejects dates that do not exist', () => {
    expect(parseCapture('x !31nov', WED()).due).toBeNull()
    expect(parseCapture('x !0dec', WED()).due).toBeNull()
    expect(parseCapture('x !12foo', WED()).due).toBeNull()
  })

  it('takes a time after a date', () => {
    expect(parseCapture('Dentist !12dec 08:15', WED()).due).toEqual({
      day: '2026-12-12',
      time: '08:15',
    })
  })
})

describe('parseCapture: what it leaves alone', () => {
  it('ignores a ! that is not a date', () => {
    for (const text of ['Wow!', 'This is !important', 'a!today', 'x !', '!!', '!today5']) {
      expect(parseCapture(text, WED())).toEqual({ text, due: null, token: null })
    }
  })

  it('uses the first date token and keeps any other', () => {
    const p = parseCapture('A !important B !fri C !mon', WED())
    expect(p.due?.day).toBe('2026-11-27')
    expect(p.text).toBe('A !important B C !mon')
  })

  it('allows punctuation right after the token', () => {
    const p = parseCapture('Ship it !fri, then rest', WED())
    expect(p.due?.day).toBe('2026-11-27')
    expect(p.text).toBe('Ship it, then rest')
  })

  it('works on a later line, and keeps the line break', () => {
    const p = parseCapture('Trip\nBook hotel !tomorrow\nPack', WED())
    expect(p.due?.day).toBe('2026-11-26')
    expect(p.text).toBe('Trip\nBook hotel\nPack')
  })
})

describe('splitCapture', () => {
  it('makes the first non-empty line the title and the rest the body', () => {
    expect(splitCapture('\n  Pay rent  \n\nTo Sam\nby card\n')).toEqual({
      title: 'Pay rent',
      body: 'To Sam\nby card',
    })
    expect(splitCapture('One line')).toEqual({ title: 'One line', body: '' })
    expect(splitCapture('  \n ')).toEqual({ title: '', body: '' })
    expect(splitCapture('A\r\nB')).toEqual({ title: 'A', body: 'B' })
  })
})
