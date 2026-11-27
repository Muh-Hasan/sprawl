import { useEffect } from 'react'
import { IconNotebook } from '@tabler/icons-react'
import { dayKey } from '@shared/due'
import type { LogEntry } from '@shared/types'
import { EmptyState } from '@/components/EmptyState'
import { TopBar } from '@/components/TopBar'
import { showUndoToast } from '@/components/UndoToast'
import { LOG_SHORTCUTS, matchesShortcut } from '@/lib/shortcuts'
import { useClockStore } from '@/stores/clockStore'
import { useLogStore } from '@/stores/logStore'
import { PANEL_INSET } from '@/lib/panelInset'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { CarriedOver } from './CarriedOver'
import { Composer } from './Composer'
import { stepDay, stripDays } from './days'
import { Entry, type EntryActions } from './Entry'
import { LogHeader } from './LogHeader'
import { useDaysWithEntries, useLogDay } from './useLogData'
import { WeekStrip } from './WeekStrip'

/** Shows a day, or today with null (so the view follows midnight). */
function pickDay(day: string | null, today: string): void {
  useLogStore.getState().setDay(day === null || day === today ? null : day)
}

/** Ctrl+[ and Ctrl+] step through the days while the log is showing (PRODUCT §4). */
function useDayKeys(day: string, today: string): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const dir = matchesShortcut(e, LOG_SHORTCUTS.prevDay)
        ? -1
        : matchesShortcut(e, LOG_SHORTCUTS.nextDay)
          ? 1
          : 0
      if (dir === 0 || e.defaultPrevented) return
      // The note panel has its own keys; leave its editor alone.
      if (e.target instanceof Element && e.target.closest('[data-note-panel]')) return
      e.preventDefault()
      pickDay(stepDay(day, dir, today), today)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [day, today])
}

/**
 * The daily log (UI_SPEC §6): a page per local day with the header, the week strip, a summary,
 * the entries in time order, what was carried over from yesterday, and the composer.
 */
export function LogView() {
  const today = useClockStore((s) => dayKey(s.now))
  const day = useLogStore((s) => s.day) ?? today
  const { data, reload } = useLogDay(day)
  const strip = stripDays(day, today)
  const marked = useDaysWithEntries(strip, data)
  useDayKeys(day, today)

  const entries = data.day === day ? data.entries : []
  const done = entries.filter((e) => e.kind === 'done').length

  const actions: EntryActions = {
    openNote: (id) => useUiStore.getState().openNote(id),
    update: (id, patch) => void window.sprawl.log.update(id, patch).then(reload),
    remove: (entry: LogEntry) => {
      void window.sprawl.log.remove(entry.id).then(reload)
      showUndoToast('Deleted', () => {
        void window.sprawl.log.addManual(entry.day, entry.text, entry.at).then(reload)
      })
    },
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <TopBar left="Daily log" />
      <div className={cn('relative min-h-0 flex-1', PANEL_INSET)}>
        <div className="h-full overflow-y-auto">
          <div
            data-testid="log-page"
            data-day={day}
            className="mx-auto w-full max-w-[680px] px-6 pt-8 pb-24"
          >
            <LogHeader
              day={day}
              today={today}
              onPick={(d) => pickDay(d, today)}
              onStep={(dir) => pickDay(stepDay(day, dir, today), today)}
            />
            <WeekStrip
              days={strip}
              selected={day}
              today={today}
              marked={marked}
              onPick={(d) => pickDay(d, today)}
            />
            <p data-testid="log-summary" className="mt-5 text-xs text-muted-foreground">
              {done} done · {entries.length - done} logged
            </p>
            {data.day === day && entries.length === 0 ? (
              <div className="h-48">
                <EmptyState icon={IconNotebook} testId="log-empty">
                  Nothing logged yet. Mark a note done or write what you just did.
                </EmptyState>
              </div>
            ) : (
              <div data-testid="log-entries" className="mt-2">
                {entries.map((entry) => (
                  <Entry
                    key={entry.id}
                    entry={entry}
                    fresh={data.fresh.has(entry.id)}
                    {...actions}
                  />
                ))}
              </div>
            )}
            {data.day === day && <CarriedOver notes={data.carried} onOpen={actions.openNote} />}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-0 right-[var(--canvas-inset-right,0px)] transition-[right] duration-240 ease-(--ease-out)">
          <div className="pointer-events-auto mx-auto w-full max-w-[680px] px-6">
            <Composer
              onSubmit={async (text) => {
                await window.sprawl.log.addManual(day, text)
                reload()
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
