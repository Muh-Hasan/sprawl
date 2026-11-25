import { create } from 'zustand'

/** How often the shared clock ticks. Due states change at minute boundaries at the finest. */
const TICK_MS = 30_000

interface ClockState {
  /** Now, in ms, updated every 30s (and when the window comes back into focus). */
  now: number
}

/** Set while main's clock is fixed (E2E tests only), so "today" here matches main's. */
let fixed: number | null = null

/** Now, in ms: the real time, or main's fixed test clock. */
export function clockNow(): number {
  return fixed ?? Date.now()
}

/**
 * One shared clock for everything that shows time-relative state (due chips, "Today", the
 * daily log), so a canvas full of cards doesn't run a timer each.
 */
export const useClockStore = create<ClockState>()(() => ({ now: clockNow() }))

let timer: ReturnType<typeof setInterval> | null = null

/** Starts the ticks (once, from App). Returns the stop function. */
export function startClock(): () => void {
  const tick = (): void => useClockStore.setState({ now: clockNow() })
  if (timer) clearInterval(timer)
  timer = setInterval(tick, TICK_MS)
  window.addEventListener('focus', tick)
  const off = window.sprawl.on('clock:changed', ({ now }) => {
    fixed = now
    if (now === null) delete document.documentElement.dataset.fixedNow
    else document.documentElement.dataset.fixedNow = String(now)
    tick()
  })
  return () => {
    if (timer) clearInterval(timer)
    timer = null
    window.removeEventListener('focus', tick)
    off()
  }
}
