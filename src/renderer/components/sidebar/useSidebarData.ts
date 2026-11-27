import { useEffect, useState } from 'react'
import type { NoteListRow } from '@shared/types'
import { useClockStore } from '@/stores/clockStore'
import { useListStore } from '@/stores/listStore'
import { useUiStore } from '@/stores/uiStore'

/** How many notes the sidebar's Recent section lists (UI_SPEC §2). */
export const SIDEBAR_RECENT_NOTES = 5

/**
 * What the sidebar shows changes when notes do: a list change, a saved edit, the panel opening
 * or closing, or the view changing. Each of those asks again.
 */
function useNotesSignal(): readonly unknown[] {
  const rev = useListStore((s) => s.rev)
  const edits = useListStore((s) => s.edits)
  const view = useUiStore((s) => s.view)
  const openNoteId = useUiStore((s) => s.openNoteId)
  return [rev, edits, view, openNoteId]
}

/** Runs `fetch` again whenever `deps` change, keeping the last answer until the next one lands. */
function useRefetched<T>(fetch: () => Promise<T>, initial: T, deps: readonly unknown[]): T {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    let live = true
    fetch()
      .then((v) => live && setValue(v))
      .catch(() => undefined)
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the signal
  }, deps)
  return value
}

/** How many open notes are overdue, for the List badge. Asked again as the clock ticks too. */
export function useOverdueCount(): number {
  const now = useClockStore((s) => s.now)
  const signal = useNotesSignal()
  return useRefetched(() => window.sprawl.notes.overdueCount(), 0, [now, ...signal])
}

/** The open notes edited last, newest first, for the Recent section. */
export function useRecentNotes(): NoteListRow[] {
  const signal = useNotesSignal()
  return useRefetched(
    () =>
      window.sprawl.notes
        .list({ tab: 'open', colors: [], text: '', sort: 'edited' })
        .then((rows) => rows.slice(0, SIDEBAR_RECENT_NOTES)),
    [],
    signal,
  )
}
