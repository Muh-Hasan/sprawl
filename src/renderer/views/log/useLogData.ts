import { useCallback, useEffect, useRef, useState } from 'react'
import type { LogEntry, NoteSummary } from '@shared/types'
import { useLogStore } from '@/stores/logStore'
import { monthsOf } from './days'

export interface LogData {
  /** The day the data is for, or null while the first load runs. */
  day: string | null
  entries: LogEntry[]
  carried: NoteSummary[]
  /** How many days in a row have entries, ending on this day. */
  streak: number
  /** Entries that weren't there the last time this day loaded: they get the row highlight. */
  fresh: ReadonlySet<string>
}

const EMPTY: LogData = { day: null, entries: [], carried: [], streak: 0, fresh: new Set() }

/**
 * A day's entries, carried-over notes and streak, refetched when the day changes, when the log changes
 * elsewhere (a note marked done), and after an edit here (`reload`).
 */
export function useLogDay(day: string): { data: LogData; reload: () => void } {
  const rev = useLogStore((s) => s.rev)
  const [data, setData] = useState<LogData>(EMPTY)
  const [tick, setTick] = useState(0)
  /** The entry ids each day showed last, so new ones can be told apart. */
  const seen = useRef(new Map<string, Set<string>>())

  useEffect(() => {
    let live = true
    const { log: api } = window.sprawl
    void Promise.all([api.day(day), api.carriedOver(day), api.streak(day)]).then(
      ([log, carried, streak]) => {
        if (!live) return
        const before = seen.current.get(day)
        const ids = new Set(log.entries.map((e) => e.id))
        const fresh = new Set(before ? [...ids].filter((id) => !before.has(id)) : [])
        seen.current.set(day, ids)
        setData({ day, entries: log.entries, carried, streak, fresh })
      },
    )
    return () => {
      live = false
    }
  }, [day, rev, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, reload }
}

/** The days with entries among the months that `days` touch (the week strip's dots). */
export function useDaysWithEntries(days: readonly string[], refresh: unknown): ReadonlySet<string> {
  const key = monthsOf(days).join(',')
  const [marked, setMarked] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    let live = true
    const months = key.split(',')
    void Promise.all(months.map((m) => window.sprawl.log.daysWithEntries(m))).then((lists) => {
      if (live) setMarked(new Set(lists.flat()))
    })
    return () => {
      live = false
    }
  }, [key, refresh])
  return marked
}
