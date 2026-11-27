import { useCallback, useRef } from 'react'
import { useNoteStore } from '@/stores/noteStore'
import { useFocusRequest } from './useFocusRequest'

interface NoteTitleProps {
  /** Enter moves on to the body, like Notion. */
  onEnter(): void
}

/**
 * The note title (UI_SPEC §5): a borderless textarea in `text-title` that grows with the text,
 * "Untitled" as the placeholder. It's one line of text, so Enter doesn't insert a newline.
 */
export function NoteTitle({ onEnter }: NoteTitleProps) {
  const title = useNoteStore((s) => s.note?.title ?? '')
  const noteId = useNoteStore((s) => s.note?.id)
  const ref = useRef<HTMLTextAreaElement>(null)
  // A new list note, or an untitled one opened from the canvas, opens with the cursor here.
  useFocusRequest(
    noteId,
    'title',
    useCallback(() => ref.current?.focus(), []),
  )
  return (
    <textarea
      ref={ref}
      data-testid="note-panel-title"
      aria-label="Title"
      rows={1}
      value={title}
      placeholder="Untitled"
      spellCheck={false}
      onChange={(e) =>
        useNoteStore.getState().edit({ title: e.target.value.replace(/\s*\n\s*/g, ' ') })
      }
      onBlur={(e) => {
        const trimmed = e.currentTarget.value.trim()
        if (trimmed !== e.currentTarget.value) useNoteStore.getState().edit({ title: trimmed })
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
          e.preventDefault()
          onEnter()
        }
      }}
      className="mt-2 block w-full resize-none bg-transparent p-0 text-title text-foreground outline-none field-sizing-content placeholder:text-subtle-foreground"
    />
  )
}
