import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NoteListRow } from '@shared/types'
import { TopBar } from '@/components/TopBar'
import { DONE_EXIT_MS } from '@/stores/canvasStore'
import { useClockStore } from '@/stores/clockStore'
import { useListStore } from '@/stores/listStore'
import { PANEL_INSET } from '@/lib/panelInset'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { showNoteOnCanvas } from '@/views/canvas/actions'
import { deleteNote, duplicateNote, placeOnCanvas, setNoteDone } from './listActions'
import { ListEmpty } from './ListEmpty'
import { ListFilters } from './ListFilters'
import { ListGroup } from './ListGroup'
import { ListHeader } from './ListHeader'
import { groupByDue, groupsTab, leavesTab } from './listLogic'
import { NoteRow, type RowActions } from './NoteRow'
import { setNotePinned } from '../note/pinActions'
import { useListKeys } from './useListKeys'
import { useListCounts, useListRows } from './useListRows'

/**
 * The List view (PRODUCT §3.3, UI_SPEC §5b): every note in one list, filtered by tab, color and
 * title. Rows ticked done fade out of the Open and Due tabs, which group their rows by due date.
 */
export function ListView() {
  const filter = useListStore((s) => s.filter)
  const filtering = useListStore((s) => s.text.trim() !== '' || s.filter.colors.length > 0)
  const now = useClockStore((s) => s.now)
  const rows = useListRows()
  const counts = useListCounts()
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set())
  /** The keyboard-selected row, and where it was (so a row that leaves passes it on). */
  const [picked, setPicked] = useState<{ id: string; index: number } | null>(null)

  useEffect(() => void useListStore.getState().load(), [])

  const groups = useMemo(
    () => (rows && groupsTab(filter.tab) ? groupByDue(rows, now) : null),
    [rows, filter.tab, now],
  )
  // The rows in the order they show, so the arrows follow the groups.
  const shown = useMemo(() => groups?.flatMap((g) => g.rows) ?? rows ?? [], [groups, rows])
  // A selected row that left the list (done, deleted) hands the selection to the one in its place.
  const cursor = useMemo(() => {
    if (!picked || shown.length === 0) return null
    if (shown.some((r) => r.id === picked.id)) return picked.id
    return shown[Math.min(picked.index, shown.length - 1)]!.id
  }, [picked, shown])
  const setCursor = useCallback(
    (id: string | null) =>
      setPicked(
        id === null
          ? null
          : {
              id,
              index: Math.max(
                0,
                shown.findIndex((r) => r.id === id),
              ),
            },
      ),
    [shown],
  )

  const toggleDone = useCallback(
    (row: NoteListRow) => {
      const done = row.doneAt === null
      const tab = useListStore.getState().filter.tab
      const fade = leavesTab(tab, done)
      if (fade) setLeaving((s) => new Set(s).add(row.id))
      const settle = new Promise((r) => setTimeout(r, fade ? DONE_EXIT_MS : 0))
      void Promise.all([setNoteDone(row.id, done), settle]).finally(() => {
        useListStore.getState().changed()
        setLeaving((s) => {
          const next = new Set(s)
          next.delete(row.id)
          return next
        })
      })
    },
    [setLeaving],
  )

  const actions = useMemo<RowActions>(
    () => ({
      open: (id) => {
        setCursor(id)
        useUiStore.getState().openNote(id)
      },
      toggleDone,
      showOnCanvas: showNoteOnCanvas,
      place: (id) => void placeOnCanvas(id),
      setPinned: (id, pinned) => void setNotePinned(id, pinned),
      duplicate: (id) => void duplicateNote(id),
      remove: (id) => void deleteNote(id),
    }),
    [toggleDone, setCursor],
  )

  useListKeys({
    rows: shown,
    cursor,
    setCursor,
    open: actions.open,
    toggleDone,
    remove: actions.remove,
  })

  // The selected row stays in view as the arrows move it.
  useEffect(() => {
    if (cursor === null) return
    document
      .querySelector(`[data-testid="list-row"][data-note-id="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const onFilterKey = (e: React.KeyboardEvent): void => {
    if (e.key !== 'ArrowDown' || shown.length === 0) return
    e.preventDefault()
    ;(e.target as HTMLElement).blur()
    setCursor(shown[0]!.id)
  }

  const renderRow = (row: NoteListRow) => (
    <NoteRow
      key={row.id}
      row={row}
      now={now}
      selected={row.id === cursor}
      leaving={leaving.has(row.id)}
      actions={actions}
    />
  )

  return (
    <div data-testid="list-view" className="flex h-full flex-col bg-background">
      <TopBar />
      <div className={cn('flex min-h-0 flex-1 flex-col', PANEL_INSET)}>
        <div className="mx-auto w-full max-w-[880px] shrink-0 px-10 pt-9">
          <ListHeader count={rows?.length ?? null} />
          <ListFilters counts={counts} onFilterKey={onFilterKey} />
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <div
            role="listbox"
            aria-label="Notes"
            data-testid="list-rows"
            className="mx-auto w-full max-w-[880px] px-10 pb-16"
          >
            {rows !== null && rows.length === 0 && (
              <ListEmpty filtering={filtering} tab={filter.tab} />
            )}
            {groups
              ? groups.map(({ group, rows: groupRows }) => (
                  <ListGroup key={group} group={group} count={groupRows.length}>
                    {groupRows.map(renderRow)}
                  </ListGroup>
                ))
              : shown.map(renderRow)}
          </div>
        </div>
      </div>
    </div>
  )
}
