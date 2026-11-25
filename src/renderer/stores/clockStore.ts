import { create } from 'zustand'

/** How often the shared clock ticks. Due states change at minute boundaries at the finest. */
const TICK_MS = 30_000

interface ClockState {
  /** Now, in ms, updated every 30s (and when the window comes back into focus). */
  now: number
}

/**
 * One shared clock for everything that shows time-relative state (due chips, "Today"), so
 * a canvas full of cards doesn't run a timer each.
 */
export const useClockStore = create<ClockState>()(() => ({ now: Date.now() }))

let timer: ReturnType<typeof setInterval> | null = null

/** Starts the ticks (once, from App). Returns the stop function. */
export function startClock(): () => void {
  const tick = (): void => useClockStore.setState({ now: Date.now() })
  if (timer) clearInterval(timer)
  timer = setInterval(tick, TICK_MS)
  window.addEventListener('focus', tick)
  return () => {
    if (timer) clearInterval(timer)
    timer = null
    window.removeEventListener('focus', tick)
  }
}
