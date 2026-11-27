import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconListCheck, IconPlus } from '@tabler/icons-react'
import type { NoteListRow } from '@shared/types'
import { EmptyState } from '@/components/EmptyState'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { DONE_EXIT_MS } from '@/stores/canvasStore'
import { useClockStore } from '@/stores/clockStore'
import { useListStore } from '@/stores/listStore'
import { useUiStore } from '@/stores/uiStore'
import { showNoteOnCanvas } from '@/views/canvas/actions'
import {
  createListNote,
  deleteNote,
  duplicateNote,
  placeOnCanvas,
  setNoteDone,
} from './listActions'
import { ListFilters } from './ListFilters'
import { countLabel, DUE_GROUP_LABELS, groupByDue, leavesTab } from './listLogic'
import { NoteRow, type RowActions } from './NoteRow'
import { setNotePinned } from '../note/pinActions'
import { useListKeys } from './useListKeys'
import { useListRows } from './useListRows'

const EMPTY: Record<string, string> = {
  open: 'All clear. Nothing open right now.',
  due: 'Nothing due. Add a due date to a note to see it here.',
  done: 'Nothing done yet. Tick a note and it shows up here.',
  all: 'No notes yet.',
}

/**
 * The List view (PRODUCT §3.3, UI_SPEC §5b): every note in one dense list, filtered by tab, color
 * and title. Rows ticked done fade out of the Open and Due tabs; the Due tab groups its rows.
 */
export function ListView() {
  const filter = useListStore((s) => s.filter)
  const filtering = useListStore((s) => s.text.trim() !== '' || s.filter.colors.length > 0)
  const now = useClockStore((s) => s.now)
  const rows = useListRows()
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set())
  /** The keyboard-selected row, and where it was (so a row that leaves passes it on). */
  const [picked, setPicked] = useState<{ id: string; index: number } | null>(null)

  useEffect(() => void useListStore.getState().load(), [])

  const shown = useMemo(() => rows ?? [], [rows])
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
      <div className="mx-auto w-full max-w-[960px] shrink-0 px-6">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold">Notes</h1>
            <span data-testid="list-count" className="text-sm text-muted-foreground">
              {rows && countLabel(filter.tab, rows.length)}
            </span>
          </div>
          <Button
            data-testid="list-new-note"
            variant="secondary"
            size="sm"
            onClick={() => void createListNote()}
          >
            <IconPlus stroke={2} aria-hidden />
            New note
          </Button>
        </div>
        <ListFilters onFilterKey={onFilterKey} />
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        <div
          role="listbox"
          aria-label="Notes"
          data-testid="list-rows"
          className="mx-auto w-full max-w-[960px] px-6 pb-6"
        >
          {rows !== null && rows.length === 0 && (
            <div className="h-64">
              <EmptyState icon={IconListCheck} testId="list-empty">
                {filtering ? 'No notes match these filters.' : EMPTY[filter.tab]}
              </EmptyState>
            </div>
          )}
          {filter.tab === 'due'
            ? groupByDue(shown, now).map(({ group, rows: groupRows }) => (
                <section key={group} data-testid={`list-group-${group}`}>
                  <h2
                    className={
                      group === 'overdue'
                        ? 'sticky top-0 z-10 flex h-8 items-center bg-background px-3 text-2xs font-semibold text-due-overdue'
                        : 'sticky top-0 z-10 flex h-8 items-center bg-background px-3 text-2xs font-semibold text-subtle-foreground'
                    }
                  >
                    {DUE_GROUP_LABELS[group]}
                  </h2>
                  {groupRows.map(renderRow)}
                </section>
              ))
            : shown.map(renderRow)}
        </div>
      </div>
    </div>
  )
}
