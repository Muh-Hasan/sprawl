import { useEffect, useState } from 'react'
import type { Note, NoteListRow } from '@shared/types'
import { useListStore } from '@/stores/listStore'
import { useNoteStore } from '@/stores/noteStore'
import { useUiStore } from '@/stores/uiStore'

/** What a row shows of an open note's live state, while the panel edits it. */
function rowFields(note: Note): Partial<NoteListRow> {
  return {
    title: note.title,
    color: note.color,
    checkTotal: note.checkTotal,
    checkDone: note.checkDone,
    linkCount: note.links.length,
    dueDay: note.dueDay,
    dueTime: note.dueTime,
    doneAt: note.doneAt,
    onCanvas: note.onCanvas,
  }
}

/**
 * The List view's rows for the current filter. They're fetched again when the filter, the title
 * filter or the list revision changes, and when the panel closes (for the order and the first
 * line); while the panel is open, its note's row follows the edits live.
 */
export function useListRows(): NoteListRow[] | null {
  const filter = useListStore((s) => s.filter)
  const loaded = useListStore((s) => s.loaded)
  const text = useListStore((s) => s.text)
  const rev = useListStore((s) => s.rev)
  const [rows, setRows] = useState<NoteListRow[] | null>(null)

  useEffect(() => {
    if (!loaded) return
    let live = true
    void window.sprawl.notes
      .list({ ...filter, text })
      .then((next) => live && setRows(next))
      .catch((err: unknown) => console.error('[list] load failed', err))
    return () => {
      live = false
    }
  }, [filter, loaded, text, rev])

  // The panel's edits show in its row right away.
  useEffect(
    () =>
      useNoteStore.subscribe((s, prev) => {
        const note = s.note
        if (!note || note === prev.note) return
        setRows((current) => {
          if (!current?.some((r) => r.id === note.id)) return current
          return current.map((r) => (r.id === note.id ? { ...r, ...rowFields(note) } : r))
        })
      }),
    [],
  )

  // Closing the panel refetches: the edit time, order and first line may have changed.
  useEffect(
    () =>
      useUiStore.subscribe((s, prev) => {
        if (prev.openNoteId !== null && s.openNoteId !== prev.openNoteId) {
          useListStore.getState().changed()
        }
      }),
    [],
  )

  return rows
}
