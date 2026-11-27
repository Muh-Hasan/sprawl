import { useState } from 'react'
import { format } from 'date-fns'
import {
  IconArrowsDiagonal,
  IconCheck,
  IconArrowsDiagonalMinimize2,
  IconCopy,
  IconDots,
  IconPin,
  IconPinnedOff,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { ColorSwatches } from '@/components/ColorSwatches'
import { HintTooltip } from '@/components/HintTooltip'
import { IconButton } from '@/components/IconButton'
import { DropdownMenuContent, DropdownMenuItem } from '@/components/Menu'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { PANEL_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'
import { useNoteStore } from '@/stores/noteStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useUiStore } from '@/stores/uiStore'
import { deleteSelection, duplicateSelection, openSelectedNote } from '../canvas/actions'
import { deleteNote, duplicateNote } from '../list/listActions'
import { pinLabel, setNotePinned } from './pinActions'

/**
 * Selects the note's card, so the canvas commands (with their toasts and undo) act on it. Only
 * while the canvas is loaded; otherwise (the list, the log) the note commands are used.
 */
function selectCard(noteId: string): boolean {
  const canvas = useCanvasStore.getState()
  if (!canvas.ready) return false
  const card = canvas.cardOf(noteId)
  if (card === null) return false
  useSelectionStore.getState().select([card])
  return true
}

/**
 * The panel's header row (UI_SPEC §5), 52px with a bottom border: the color swatch and the
 * breadcrumb (where the note lives, then its title) on the left; Mark done, full page, the ⋯
 * menu and close on the right. On the full page it spans the window's top, so it's the drag
 * region there and keeps clear of the caption buttons, and it has no close button.
 * later: phase-11 adds Export as markdown to the menu.
 */
export function PanelHeader() {
  const note = useNoteStore((s) => s.note)
  const mode = useUiStore((s) => s.panelMode)
  const [colorOpen, setColorOpen] = useState(false)
  if (!note) return null
  const full = mode === 'full'
  const pinned = note.pinnedAt !== null

  const duplicate = (): void => {
    if (!selectCard(note.id)) return void duplicateNote(note.id)
    duplicateSelection()
    openSelectedNote()
  }
  const remove = (): void => {
    if (selectCard(note.id)) deleteSelection()
    else void deleteNote(note.id)
  }

  return (
    <header
      className={cn(
        'flex h-13 shrink-0 items-center gap-1 border-b border-border',
        full
          ? 'pr-[calc(var(--spacing-caption)+16px)] pl-5 [-webkit-app-region:drag] [&_button]:[-webkit-app-region:no-drag]'
          : 'pr-2.5 pl-[18px]',
      )}
    >
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <HintTooltip label="Color">
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid="note-panel-color-dot"
              aria-label="Color"
              className="-ml-1 flex size-6 shrink-0 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={cn('size-3 rounded-[4px]', NOTE_COLOR_CLASSES[note.color].swatch)} />
            </button>
          </PopoverTrigger>
        </HintTooltip>
        <PopoverContent align="start" className="w-auto p-3 shadow-(--shadow-popover)">
          <ColorSwatches
            value={note.color}
            testIdPrefix="note-panel-dot-color"
            onChange={(color) => {
              useNoteStore.getState().setColor(color)
              setColorOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      <span
        data-testid="note-panel-breadcrumb"
        className="ml-1 min-w-0 flex-1 truncate text-xs text-subtle-foreground"
      >
        {note.onCanvas ? 'Canvas' : 'Not on canvas'}
        <span className="text-border-strong"> / </span>
        <span className="text-foreground/80">{note.title.trim() || 'Untitled'}</span>
      </span>
      <DoneControl />
      <IconButton
        data-testid="note-panel-full"
        size="md"
        icon={full ? IconArrowsDiagonalMinimize2 : IconArrowsDiagonal}
        label={full ? 'Back to side panel' : 'Full page'}
        shortcut={shortcutLabel(PANEL_SHORTCUTS.fullPage)}
        onClick={() => useUiStore.getState().setPanelMode(full ? 'side' : 'full')}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton data-testid="note-panel-menu" size="md" icon={IconDots} label="More" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            data-testid="note-panel-pin"
            onSelect={() => void setNotePinned(note.id, !pinned)}
          >
            {pinned ? <IconPinnedOff stroke={1.75} /> : <IconPin stroke={1.75} />}
            {pinLabel(pinned)}
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="note-panel-duplicate" onSelect={duplicate}>
            <IconCopy stroke={1.75} />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="note-panel-delete" variant="destructive" onSelect={remove}>
            <IconTrash stroke={1.75} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {!full && (
        <IconButton
          data-testid="note-panel-close"
          size="md"
          icon={IconX}
          label="Close"
          shortcut="Esc"
          onClick={() => useUiStore.getState().closeNote()}
        />
      )}
    </header>
  )
}

/**
 * Mark done (Ctrl+Enter) as a ghost button, or "Done · 18:30" with Undo once the note is done.
 */
function DoneControl() {
  const doneAt = useNoteStore((s) => s.note?.doneAt ?? null)
  const setDone = useNoteStore((s) => s.setDone)
  if (doneAt !== null) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <span data-testid="note-panel-done" className="px-1 text-xs text-muted-foreground">
          Done · {format(doneAt, 'HH:mm')}
        </span>
        <Button
          data-testid="note-panel-undo-done"
          variant="ghost"
          size="sm"
          className="text-foreground hover:bg-muted dark:hover:bg-muted"
          onClick={() => setDone(false)}
        >
          Undo
        </Button>
      </div>
    )
  }
  return (
    <HintTooltip label="Mark done" shortcut={shortcutLabel(PANEL_SHORTCUTS.markDone)}>
      <Button
        data-testid="note-panel-mark-done"
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1.5 px-2.5 text-xs font-medium text-foreground/85 hover:bg-muted hover:text-foreground dark:hover:bg-muted"
        onClick={() => setDone(true)}
      >
        <IconCheck className="size-4" stroke={2} aria-hidden />
        Mark done
      </Button>
    </HintTooltip>
  )
}
