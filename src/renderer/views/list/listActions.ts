import { nanoid } from 'nanoid'
import { IconCheck, IconCopy, IconTrash } from '@tabler/icons-react'
import type { Note } from '@shared/types'
import { showToast } from '@/components/toasts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useListStore } from '@/stores/listStore'
import { useLogStore } from '@/stores/logStore'
import { useNoteStore } from '@/stores/noteStore'
import { useUiStore } from '@/stores/uiStore'
import { viewCenter } from '@/views/canvas/actions'

/**
 * The List view's commands (PRODUCT §3.3). The list works on notes directly, not on canvas cards
 * (the canvas isn't loaded while the list shows; it reloads when it opens again).
 */

const changed = (): void => useListStore.getState().changed()

const openNote = (): Note | null => useNoteStore.getState().note

/** Keeps the open panel in step with a change made from the list. */
function patchOpenNote(id: string, patch: Partial<Note>): void {
  const note = openNote()
  if (note?.id === id) useNoteStore.setState({ note: { ...note, ...patch } })
}

/** Marks a note done (with its log entry) or not done; "Marked done · Undo" follows a done. */
export async function setNoteDone(id: string, done: boolean): Promise<void> {
  if (openNote()?.id === id) useNoteStore.getState().flush()
  const saved = await window.sprawl.notes.setDone(id, done)
  patchOpenNote(id, { doneAt: saved.doneAt })
  useLogStore.getState().changed()
  if (done) {
    showToast('Marked done', {
      icon: IconCheck,
      strong: true,
      onUndo: () => void setNoteDone(id, false).then(changed),
    })
  }
}

/** Deletes a note (and its card), with "Deleted · Undo". */
export async function deleteNote(id: string): Promise<void> {
  const ui = useUiStore.getState()
  if (ui.openNoteId === id) ui.closeNote()
  await window.sprawl.notes.remove(id)
  changed()
  showToast('Deleted', {
    icon: IconTrash,
    onUndo: () => void window.sprawl.notes.restore(id).then(changed),
  })
}

export async function duplicateNote(id: string): Promise<void> {
  if (openNote()?.id === id) useNoteStore.getState().flush()
  await window.sprawl.notes.duplicate(id)
  changed()
  showToast('Duplicated', { icon: IconCopy })
}

/** Gives a list-only note a card in the middle of the last canvas view. */
export async function placeOnCanvas(id: string): Promise<void> {
  const { size } = useCanvasStore.getState()
  // The canvas knows its last view and size once it has been shown; otherwise main works it out.
  const at = size.width > 0 ? viewCenter() : undefined
  await window.sprawl.notes.placeOnCanvas(id, at)
  patchOpenNote(id, { onCanvas: true })
  changed()
}

/**
 * A new note with no card (PRODUCT §3.3), opened in the panel. Without a title, the cursor waits
 * in the title.
 */
export async function createListNote(title = ''): Promise<void> {
  const id = nanoid()
  await window.sprawl.notes.create({ id, title, color: 'stone' })
  changed()
  useUiStore.getState().openNote(id, { focus: title === '' ? 'title' : undefined })
}
