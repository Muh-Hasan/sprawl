import { lazy, Suspense, useEffect, useRef } from 'react'
import { useNoteStore } from '@/stores/noteStore'
import { useSelectionStore } from '@/stores/selectionStore'

/** The same editor as the panel's, loaded the first time a note is written in (ARCHITECTURE §6). */
const Editor = lazy(() => import('@/views/note/Editor'))

/**
 * Where the editor's menus and toolbars live: BlockNote portals them to a themed `.bn-root` under
 * <body> (outside the zoomed canvas layer, see Editor's `card` variant).
 */
const FLOATING_UI = '.bn-root, [data-floating-ui-portal], [data-radix-popper-content-wrapper]'

/**
 * Writing in a note card (UI_SPEC §4.5): the body becomes the note editor, in the card, with
 * markdown shortcuts and the `/` menu. It edits the same note the panel would, through the note
 * store (one place at a time), so the autosave and the card's chips work the same. Esc, or
 * focus going anywhere but the editor and its menus, ends it.
 */
export function CardBody({ itemId, noteId }: { itemId: string; noteId: string }) {
  const note = useNoteStore((s) => (s.note?.id === noteId ? s.note : null))
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void useNoteStore.getState().open(noteId)
    return () => useNoteStore.getState().close()
  }, [noteId])

  const end = (): void => {
    const sel = useSelectionStore.getState()
    if (sel.bodyEditing === itemId) sel.setBodyEditing(null)
  }

  return (
    <div
      ref={box}
      data-card-editor
      // Presses in here are for the text, never a card drag or a marquee.
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={() => {
        // Focus moves after blur; look where it went once it has.
        setTimeout(() => {
          // The window lost focus (another app): keep writing when it comes back.
          if (!document.hasFocus()) return
          const active = document.activeElement
          if (box.current?.contains(active) || active?.closest(FLOATING_UI)) return
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
