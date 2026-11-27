import { useState } from 'react'
import { format } from 'date-fns'
import { IconCircleCheck, IconPencil, IconTrash } from '@tabler/icons-react'
import type { LogEntry } from '@shared/types'
import { IconButton } from '@/components/IconButton'
import { InlineMarkdown } from '@/components/InlineMarkdown'
import { COLOR_NAMES, NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { parseTime } from '@/lib/time'
import { cn } from '@/lib/utils'

export interface EntryActions {
  /** Opens a done entry's note in the panel. */
  openNote(noteId: string): void
  /** Saves a manual entry's new text or time (`HH:mm`). */
  update(id: string, patch: { text?: string; time?: string }): void
  remove(entry: LogEntry): void
}

interface EntryProps extends EntryActions {
  entry: LogEntry
  /** New since the day last loaded: slides in with the one-time highlight. */
  fresh?: boolean
}

/** Time · icon · text · tag or actions; at least 48px tall, with a hover fill (UI_SPEC §6). */
const ROW =
  'grid min-h-12 grid-cols-[64px_28px_minmax(0,1fr)_auto] items-start gap-2 rounded-[10px] px-3 py-[13px] transition-colors duration-100 hover:bg-surface'
const TIME = 'pt-0.5 text-left font-mono text-xs text-subtle-foreground'
const ICON = 'mt-0.5 size-[18px]'

/**
 * One line of the daily log (UI_SPEC §6). A done entry shows the note's title (live, or the
 * snapshot once the note is gone) and its color tag, and opens the note. A manual entry is
 * inline markdown; on hover it can be edited or deleted, and its time edited with a click.
 */
export function Entry({ entry, fresh = false, ...actions }: EntryProps) {
  const time = format(entry.at, 'HH:mm')
  const highlight = fresh && 'animate-row-highlight'
  if (entry.kind === 'done') {
    const { note, noteId } = entry
    const open = note && noteId ? () => actions.openNote(noteId) : undefined
    return (
      <div
        data-testid="log-entry"
        data-kind="done"
        data-entry-id={entry.id}
        className={cn(ROW, highlight)}
      >
        <span data-testid="log-entry-time" className={TIME}>
          {time}
        </span>
        <IconCircleCheck className={cn(ICON, 'text-foreground')} stroke={1.75} aria-label="Done" />
        <button
          type="button"
          data-testid="log-entry-open"
          disabled={!open}
          onClick={open}
          className="min-w-0 rounded-sm text-left text-base outline-none enabled:hover:underline enabled:hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span data-testid="log-entry-text" className="block truncate">
            {note?.title || entry.text || 'Untitled'}
          </span>
        </button>
        {note && (
          <span
            data-testid="log-entry-color"
            className={cn(
              '-my-px inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-2xs',
              NOTE_COLOR_CLASSES[note.color].bg,
              NOTE_COLOR_CLASSES[note.color].text,
            )}
          >
            <span className={cn('size-2 rounded-full', NOTE_COLOR_CLASSES[note.color].swatch)} />
            {COLOR_NAMES[note.color]}
          </span>
        )}
      </div>
    )
  }
  return <ManualEntry entry={entry} time={time} highlight={highlight} {...actions} />
}

function ManualEntry({
  entry,
  time,
  highlight,
  update,
  remove,
}: EntryActions & { entry: LogEntry; time: string; highlight: string | false }) {
  const [editing, setEditing] = useState<'text' | 'time' | null>(null)
  return (
    <div
      data-testid="log-entry"
      data-kind="manual"
      data-entry-id={entry.id}
      className={cn(ROW, 'group/entry', highlight)}
    >
      {editing === 'time' ? (
        <InlineInput
          testId="log-entry-time-input"
          initial={time}
          className="w-14 pt-0.5 font-mono text-xs"
          onDone={(value) => {
            setEditing(null)
            const parsed = value === null ? null : parseTime(value)
            if (parsed && parsed !== time) update(entry.id, { time: parsed })
          }}
        />
      ) : (
        <button
          type="button"
          data-testid="log-entry-time"
          aria-label={`Time ${time}, click to change`}
          onClick={() => setEditing('time')}
          className={cn(TIME, 'outline-none hover:text-foreground focus-visible:text-foreground')}
        >
          {time}
        </button>
      )}
      <IconPencil
        className={cn(ICON, 'text-subtle-foreground')}
        stroke={1.75}
        aria-label="Logged"
      />
      {editing === 'text' ? (
        <InlineInput
          testId="log-entry-input"
          initial={entry.text}
          className="text-base"
          onDone={(value) => {
            setEditing(null)
            const text = value?.trim()
            if (text && text !== entry.text) update(entry.id, { text })
          }}
        />
      ) : (
        <p data-testid="log-entry-text" className="min-w-0 text-base break-words">
          <InlineMarkdown text={entry.text} />
        </p>
      )}
      {editing === null && (
        <div className="-my-[3px] flex gap-0.5 opacity-0 transition-opacity duration-120 group-hover/entry:opacity-100 focus-within:opacity-100">
          <IconButton
            data-testid="log-entry-edit"
            icon={IconPencil}
            label="Edit"
            size="sm"
            onClick={() => setEditing('text')}
          />
          <IconButton
            data-testid="log-entry-delete"
            icon={IconTrash}
            label="Delete"
            size="sm"
            className="hover:text-destructive"
            onClick={() => remove(entry)}
          />
        </div>
      )}
    </div>
  )
}

/** A borderless inline field: Enter or leaving it saves, Esc cancels (`onDone(null)`). */
function InlineInput({
  testId,
  initial,
  className,
  onDone,
}: {
  testId: string
  initial: string
  className?: string
  onDone: (value: string | null) => void
}) {
  const [done, setDone] = useState(false)
  const finish = (value: string | null): void => {
    if (done) return
    setDone(true)
    onDone(value)
  }
  return (
    <input
      data-testid={testId}
      autoFocus
      defaultValue={initial}
      spellCheck={false}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(e.currentTarget.value)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          finish(null)
        }
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
      className={cn('min-w-0 bg-transparent p-0 outline-none', className)}
    />
  )
}
