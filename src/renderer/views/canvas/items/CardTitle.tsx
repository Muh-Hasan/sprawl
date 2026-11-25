import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { editCardBody } from '../actions'

interface CardTitleProps {
  itemId: string
  title: string
  editing: boolean
}

/**
 * A note card's title (UI_SPEC §4.5): two lines at most, "Untitled" when empty. While editing
 * it's a textarea that grows with the text. Enter saves and moves on to writing the body in the
 * card, clicking away saves, Esc puts the old title back; the title is written once, at the end.
 */
export function CardTitle({ itemId, title, editing }: CardTitleProps) {
  if (!editing) {
    return (
      <p
        data-card-title
        data-testid="note-card-title"
        className={cn('line-clamp-2 text-card-title break-words', !title && 'opacity-60')}
      >
        {/* The text itself: a double-click on it edits the title, elsewhere opens the panel. */}
        <span data-card-title-text>{title || 'Untitled'}</span>
      </p>
    )
  }
  return <TitleInput itemId={itemId} title={title} />
}

function TitleInput({ itemId, title }: { itemId: string; title: string }) {
  // Enter, Esc and blur can all fire for one edit (blur follows the unmount); finish once.
  const done = useRef(false)
  const finish = (value: string | null, thenBody = false): void => {
    if (done.current) return
    done.current = true
    if (value !== null) useCanvasStore.getState().renameNote(itemId, value)
    const sel = useSelectionStore.getState()
    if (sel.editing === itemId) sel.setEditing(null)
    // Enter goes on to the body, so a sticky is title, Enter, write.
    if (thenBody) editCardBody(itemId)
  }
  const clean = (value: string): string => value.replace(/\s*\n\s*/g, ' ').trim()

  // Not `autoFocus`: focusing scrolls the element into view, and that would scroll the
  // overflow-hidden canvas itself, shifting every card away from where the pointer math has it.
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    input.current?.focus({ preventScroll: true })
    input.current?.select()
  }, [])

  return (
    <textarea
      ref={input}
      data-testid="note-card-title-input"
      aria-label="Note title"
      rows={1}
      defaultValue={title}
      placeholder="Untitled"
      spellCheck={false}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(clean(e.currentTarget.value), true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          finish(null)
        }
      }}
      onBlur={(e) => finish(clean(e.currentTarget.value))}
      className="block w-full resize-none bg-transparent p-0 text-card-title break-words outline-none field-sizing-content placeholder:text-current placeholder:opacity-60 selection:bg-note-text-selection"
    />
  )
}
