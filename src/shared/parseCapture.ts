import { addDays, format, getDay } from 'date-fns'
import { dayKey, dayStart } from './due'

/**
 * `!date` tokens in a quick capture (PRODUCT §3.7): `!today`, `!tomorrow`, a weekday (`!fri`,
 * `!friday`), or a date (`!12dec`, `!dec12`), each with an optional `HH:mm` after it. The first
 * token that names a date sets the due date and is removed from the text. A `!` that isn't a
 * date (`Wow!`, `!important`) stays as typed.
 */

export interface CaptureDue {
  /** `YYYY-MM-DD`, local. */
  day: string
  /** `HH:mm`, or null for "sometime that day". */
  time: string | null
}

export interface ParsedCapture {
  /** The text with the token taken out. */
  text: string
  due: CaptureDue | null
  /** Where the token (with its time) was in the original text, for highlighting. */
  token: { start: number; end: number } | null
}

const WEEKDAYS: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
}

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const
const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

function monthIndex(name: string): number {
  const short = MONTHS.indexOf(name as (typeof MONTHS)[number])
  if (short >= 0) return short
  // "sept" is common enough to accept too.
  if (name === 'sept') return 8
  return MONTH_NAMES.indexOf(name)
}

/** `!` at the start or after a space, a word (letters, then digits, or the other way round),
 * then an optional time; it must end at a space, the end, or punctuation. */
const TOKEN = /(^|\s)!([a-z]+\d{0,2}|\d{1,2}[a-z]+)(?:[ \t]+(\d{1,2}):(\d{2}))?(?=$|[\s.,;:!?)])/gi

/** The day a date word names, seen from `today` (a day key), or null if it isn't one. */
export function resolveDateWord(word: string, today: string): string | null {
  const w = word.toLowerCase()
  if (w === 'today') return today
  if (w === 'tomorrow' || w === 'tmrw') return format(addDays(dayStart(today), 1), 'yyyy-MM-dd')
  const weekday = WEEKDAYS[w]
  if (weekday !== undefined) {
    // The next one, 1–7 days ahead: never today (that's !today).
    const ahead = (weekday - getDay(dayStart(today)) + 7) % 7 || 7
    return format(addDays(dayStart(today), ahead), 'yyyy-MM-dd')
  }
  const m = /^(\d{1,2})([a-z]+)$/.exec(w) ?? /^([a-z]+)(\d{1,2})$/.exec(w)
  if (!m) return null
  const [dayPart, monthPart] = /^\d/.test(m[1]!) ? [m[1]!, m[2]!] : [m[2]!, m[1]!]
  const month = monthIndex(monthPart)
  const date = Number(dayPart)
  if (month < 0 || date < 1) return null
  const year = dayStart(today).getFullYear()
  for (const y of [year, year + 1]) {
    const d = new Date(y, month, date)
    if (d.getMonth() !== month) continue // 31 Nov never exists; 29 Feb only in a leap year
    const key = format(d, 'yyyy-MM-dd')
    // This year, unless that date has already passed (today still counts as this year).
    if (key >= today) return key
  }
  return null
}

function validTime(h: string, m: string): string | null {
  const hours = Number(h)
  const minutes = Number(m)
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${m}`
}

/** Removes `[start, end)` from the text without leaving a double space or a trailing one. */
function cut(text: string, start: number, end: number): string {
  let before = text.slice(0, start)
  let after = text.slice(end)
  if (before === '' || /\s$/.test(before)) after = after.replace(/^[ \t]+/, '')
  // "Ship it !fri, then rest" → "Ship it, then rest".
  if (/^[.,;:!?)]/.test(after)) before = before.replace(/[ \t]+$/, '')
  return (before + after).replace(/[ \t]+(?=\n|$)/g, '')
}

/** Parses a note capture at `now` (ms): finds its `!date` token and takes it out of the text. */
export function parseCapture(text: string, now: number): ParsedCapture {
  const today = dayKey(now)
  for (const match of text.matchAll(TOKEN)) {
    const [, lead, word, h, m] = match
    const day = resolveDateWord(word!, today)
    if (day === null) continue
    const start = match.index + lead!.length
    let end = match.index + match[0].length
    const time = h !== undefined && m !== undefined ? validTime(h, m) : null
    // A time that isn't one (25:00) stays in the text; the date still counts.
    if (time === null && h !== undefined) end = start + 1 + word!.length
    return { text: cut(text, start, end), due: { day, time }, token: { start, end } }
  }
  return { text, due: null, token: null }
}

/** Splits a note capture into its title (the first non-empty line) and body (the rest). */
export function splitCapture(text: string): { title: string; body: string } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const first = lines.findIndex((l) => l.trim() !== '')
  if (first === -1) return { title: '', body: '' }
  return {
    title: lines[first]!.trim(),
    body: lines
      .slice(first + 1)
      .join('\n')
      .replace(/^\s*\n/, '')
      .trimEnd(),
  }
}
