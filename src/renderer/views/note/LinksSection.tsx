import { useRef, useState } from 'react'
import { IconLink, IconPencil, IconPlus, IconX } from '@tabler/icons-react'
import type { NoteLink } from '@shared/types'
import { moveItem } from '@/lib/reorder'
import { domainLetter, domainOf, normalizeUrl } from '@/lib/urls'
import { cn } from '@/lib/utils'
import { useNoteStore } from '@/stores/noteStore'
import { MetaRow } from './MetaRow'

/**
 * The note's links (UI_SPEC §5): one row each, with the domain letter, the label (or the URL)
 * and hover actions to edit the label or remove it. Clicking a link opens it in the browser;
 * rows can be dragged into a new order. "Add link" turns into a "Paste a URL" field.
 */
export function LinksSection({ links }: { links: NoteLink[] }) {
  const [adding, setAdding] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const store = useNoteStore.getState

  const drop = (to: number): void => {
    if (dragging === null || dragging === to) return
    void store().reorderLinks(moveItem(links, dragging, to).map((l) => l.id))
  }

  return (
    <MetaRow icon={IconLink} label="Links" data-testid="note-links">
      <div className="flex min-w-0 flex-1 flex-col">
        {links.map((link, i) => (
          <div
            key={link.id}
            draggable
            onDragStart={(e) => {
              setDragging(i)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => dragging !== null && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              drop(i)
            }}
            className={cn(dragging === i && 'opacity-50')}
          >
            <LinkRow link={link} />
          </div>
        ))}
        {adding ? (
          <AddLinkInput onDone={() => setAdding(false)} />
        ) : (
          <div className="flex h-8 items-center">
            <button
              type="button"
              data-testid="note-add-link"
              onClick={() => setAdding(true)}
              className="-mx-2 flex h-7 items-center gap-1.5 rounded-lg px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <IconPlus className="size-3.5" stroke={1.75} />
              Add link
            </button>
          </div>
        )}
      </div>
    </MetaRow>
  )
}

function LinkRow({ link }: { link: NoteLink }) {
  const [editing, setEditing] = useState(false)
  const text = link.label || link.url

  if (editing) {
    return (
      <div className="flex h-8 items-center">
        <LinkInput
          testId="note-link-label-input"
          initial={link.label ?? ''}
          placeholder={domainOf(link.url)}
          onSubmit={(value) => {
            const label = value.trim() === '' ? null : value.trim()
            if (label !== link.label) void useNoteStore.getState().updateLink(link.id, { label })
            return true
          }}
          onDone={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div
      data-testid="note-link"
      data-url={link.url}
      className="group -mx-2 flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted"
    >
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-muted text-[10px] font-semibold text-foreground group-hover:bg-border-strong"
      >
        {domainLetter(link.url)}
      </span>
      <button
        type="button"
        data-testid="note-link-open"
        title={link.url}
        onClick={() => void window.sprawl.app.openExternal(link.url)}
        className="min-w-0 flex-1 truncate text-left text-foreground"
      >
        {text}
      </button>
      <div className="flex shrink-0 items-center opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
        <RowAction
          testId="note-link-edit"
          label="Edit label"
          icon={IconPencil}
          onClick={() => setEditing(true)}
        />
        <RowAction
          testId="note-link-remove"
          label="Remove link"
          icon={IconX}
          onClick={() => void useNoteStore.getState().removeLink(link.id)}
        />
      </div>
    </div>
  )
}

function RowAction({
  testId,
  label,
  icon: Icon,
  onClick,
}: {
  testId: string
  label: string
  icon: typeof IconX
  onClick(): void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-border hover:text-foreground"
    >
      <Icon className="size-3.5" stroke={1.75} />
    </button>
  )
}

function AddLinkInput({ onDone }: { onDone(): void }) {
  const [invalid, setInvalid] = useState(false)
  return (
    <div className="flex h-8 items-center">
      <LinkInput
        testId="note-link-input"
        initial=""
        placeholder="Paste a URL"
        invalid={invalid}
        onChange={() => setInvalid(false)}
        onSubmit={(value) => {
          const url = normalizeUrl(value)
          if (url === null) {
            setInvalid(value.trim() !== '')
            return value.trim() === ''
          }
          void useNoteStore.getState().addLink(url, null)
          return true
        }}
        onDone={onDone}
      />
    </div>
  )
}

/**
 * A one-line field for the links section. Enter submits (`onSubmit` returns whether to close),
 * Esc cancels, and clicking away submits.
 */
function LinkInput({
  testId,
  initial,
  placeholder,
  invalid = false,
  onChange,
  onSubmit,
  onDone,
}: {
  testId: string
  initial: string
  placeholder: string
  invalid?: boolean
  onChange?(): void
  onSubmit(value: string): boolean
  onDone(): void
}) {
  const [value, setValue] = useState(initial)
  // Enter or Esc ends the field and unmounts it, which also blurs it: finish once.
  const finished = useRef(false)
  const finish = (submit: boolean): void => {
    if (finished.current) return
    if (submit && !onSubmit(value)) return
    finished.current = true
    onDone()
  }
  return (
    <input
      data-testid={testId}
      autoFocus
      value={value}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      spellCheck={false}
      onChange={(e) => {
        setValue(e.target.value)
        onChange?.()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(true)
        } else if (e.key === 'Escape') {
          // Esc here only leaves the field, not the panel.
          e.preventDefault()
          finish(false)
        }
      }}
      onBlur={() => {
        // Clicking away keeps a valid entry and drops anything else.
        if (finished.current) return
        onSubmit(value)
        finish(false)
      }}
      className={cn(
        'h-7 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-sm outline-none placeholder:text-subtle-foreground',
        'focus-visible:border-ring',
        invalid && 'border-destructive focus-visible:border-destructive',
      )}
    />
  )
}
