import { lazy, Suspense, useEffect, useRef } from 'react'
import { useNoteStore } from '@/stores/noteStore'
import { useSelectionStore } from '@/stores/selectionStore'

/** The same editor as the panel's, loaded the first time a note is written in (ARCHITECTURE §6). */
const Editor = lazy(() => import('@/views/note/Editor'))

/**
 * Writing in a note card (UI_SPEC §4.5): the body becomes the note editor's quick `card`
 * variant, in the card: plain text styled like the preview, with `[] ` for a checklist item. It
 * holds the note in the note store like the panel does, so the autosave and the chips work the
 * same, and an open panel on the same note follows the typing live. Esc, or focus going
 * anywhere but the editor, ends it.
 */
export function CardBody({ itemId, noteId }: { itemId: string; noteId: string }) {
  const note = useNoteStore((s) => (s.note?.id === noteId ? s.note : null))
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const notes = useNoteStore.getState()
    void notes.acquire(noteId)
    return () => notes.release(noteId)
  }, [noteId])

  const end = (): void => {
    const sel = useSelectionStore.getState()
    if (sel.bodyEditing === itemId) sel.setBodyEditing(null)
  }

  return (
    <div
      ref={box}
      data-card-editor
      onBlur={() => {
        // Focus moves after blur; look where it went once it has.
        setTimeout(() => {
          // The window lost focus (another app): keep writing when it comes back.
          if (!document.hasFocus()) return
          // The card variant has no menus of its own; BlockNote's floating UI (the link
          // toolbar) renders inside the card's editor, so "still here" is just this box.
          if (box.current?.contains(document.activeElement)) return
          end()
        }, 0)
      }}
      className="-mx-1 mt-1.5 min-h-0 flex-1 cursor-text overflow-y-auto px-1"
    >
      {note && (
        <Suspense fallback={null}>
          <Editor key={note.id} bodyJson={note.bodyJson} variant="card" autoFocus />
        </Suspense>
      )}
    </div>
  )
}
