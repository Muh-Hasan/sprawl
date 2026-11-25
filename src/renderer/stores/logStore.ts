import { create } from 'zustand'

interface LogState {
  /** Bumped whenever the log changes (a note marked done or not), so log views refetch. */
  rev: number
  changed(): void
  /** The day the log view shows (`YYYY-MM-DD`), or null for today. */
  day: string | null
  setDay(day: string | null): void
}

/**
 * The daily log's shared state: which day the view shows, and a revision that the canvas and
 * the panel bump after marking notes done, so the log and the status pill stay current.
 */
export const useLogStore = create<LogState>()((set) => ({
  rev: 0,
  changed: () => set((s) => ({ rev: s.rev + 1 })),
  day: null,
  setDay: (day) => set({ day }),
}))
