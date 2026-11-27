import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { dayKey } from '@shared/due'
import { useClockStore } from '@/stores/clockStore'
import { useLogStore } from '@/stores/logStore'
import { useUiStore } from '@/stores/uiStore'

/** How many notes were marked done today, refetched whenever the log changes. */
function useDoneToday(today: string): number | null {
  const rev = useLogStore((s) => s.rev)
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let live = true
    void window.sprawl.log.day(today).then((log) => {
      if (live) setCount(log.entries.filter((e) => e.kind === 'done').length)
    })
    return () => {
      live = false
    }
  }, [today, rev])
  return count
}

/** "3 done today", or "Nothing done yet" before the first. */
function doneTodayLabel(count: number): string {
  return count === 0 ? 'Nothing done yet' : `${count} done today`
}

/**
 * The canvas's bottom-left status pill (UI_SPEC §4.3): "Tue 24 Nov · 3 done today". Clicking
 * it opens today's log.
 */
export function StatusPill() {
  const now = useClockStore((s) => s.now)
  const today = dayKey(now)
  const count = useDoneToday(today)
  return (
    <button
      type="button"
      data-testid="status-pill"
      data-canvas-chrome
      onClick={() => {
        useLogStore.getState().setDay(null)
        useUiStore.getState().setView('log')
      }}
      className="absolute bottom-4 left-4 z-10 flex h-9 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-xs text-muted-foreground outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="font-medium text-foreground">{format(now, 'EEE d MMM')}</span>
      {count !== null && (
        <>
          {/* The spaces keep the text readable as one line; the flex gap does the layout. */}
          <span aria-hidden>{' · '}</span>
          <span data-testid="status-pill-done">{doneTodayLabel(count)}</span>
        </>
      )}
    </button>
  )
}
