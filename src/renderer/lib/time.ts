import { differenceInCalendarDays, format } from 'date-fns'

/**
 * Time helpers for the note panel (UI_SPEC §5): the DuePicker's time field (times are `HH:mm`)
 * and the footer's "Edited …" label.
 */

const DAY_MINUTES = 24 * 60

const pad = (n: number): string => String(n).padStart(2, '0')

function toTime(minutes: number): string {
  const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number) as [number, number]
  return h * 60 + m
}

/**
 * Reads what was typed as a time: "9", "930", "0930", "9:30", "9.30" or "09:30". Returns
 * `HH:mm`, or null if it isn't a time.
 */
export function parseTime(text: string): string | null {
  const t = text.trim()
  let h: number
  let m: number
  const sep = /^(\d{1,2})[:.](\d{2})$/.exec(t)
  const digits = /^(\d{1,4})$/.exec(t)
  if (sep) {
    h = Number(sep[1])
    m = Number(sep[2])
  } else if (digits) {
    const d = digits[1]!
    if (d.length <= 2) {
      h = Number(d)
      m = 0
    } else {
      h = Number(d.slice(0, -2))
      m = Number(d.slice(-2))
    }
  } else {
    return null
  }
  if (h > 23 || m > 59) return null
  return `${pad(h)}:${pad(m)}`
}

/**
 * Steps a time by `steps` quarter hours. An off-grid time snaps to the grid first (09:10 up is
 * 09:15, down is 09:00). Wraps around midnight.
 */
export function nudgeTime(time: string, steps: number, step = 15): string {
  const minutes = toMinutes(time)
  if (steps === 0) return toTime(minutes)
  const snapped = steps > 0 ? Math.floor(minutes / step) * step : Math.ceil(minutes / step) * step
  return toTime(snapped + steps * step)
}

const MINUTE = 60_000

/**
 * When a note was last edited, for the panel footer (UI_SPEC §5): "Edited just now" under a
 * minute, "Edited 12 min ago" under an hour, then the time today, "yesterday" and the date
 * (with the year once it isn't this year's).
 */
export function editedLabel(updatedAt: number, now: number): string {
  const ago = now - updatedAt
  if (ago < MINUTE) return 'Edited just now'
  if (ago < 60 * MINUTE) return `Edited ${Math.floor(ago / MINUTE)} min ago`
  const days = differenceInCalendarDays(now, updatedAt)
  if (days === 0) return `Edited ${format(updatedAt, 'HH:mm')}`
  if (days === 1) return 'Edited yesterday'
  const sameYear = new Date(now).getFullYear() === new Date(updatedAt).getFullYear()
  return `Edited ${format(updatedAt, sameYear ? 'd MMM' : 'd MMM yyyy')}`
}
