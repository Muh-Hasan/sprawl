import { useState } from 'react'
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
  IconCopy,
  IconDots,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { ColorSwatches } from '@/components/ColorSwatches'
import { HintTooltip } from '@/components/HintTooltip'
import { IconButton } from '@/components/IconButton'
import { DropdownMenuContent, DropdownMenuItem } from '@/components/Menu'
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
 * The panel's header row (UI_SPEC §5): the color dot and breadcrumb on the left; full page, the
 * ⋯ menu and close on the right, ending 140px from the window edge (the caption buttons).
 * Its empty parts are the window's drag region. A list-only note reads "Note · not on canvas".
 * later: phase-11 adds Export as markdown to the menu.
 */
export function PanelHeader() {
  const note = useNoteStore((s) => s.note)
  const mode = useUiStore((s) => s.panelMode)
  const [colorOpen, setColorOpen] = useState(false)
  if (!note) return null
  const full = mode === 'full'

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
    <header className="flex h-11 shrink-0 items-center justify-between gap-2 pr-[140px] pl-6 [-webkit-app-region:drag]">
      <div className="flex min-w-0 items-center gap-2 [&>*]:[-webkit-app-region:no-drag]">
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <HintTooltip label="Color">
            <PopoverTrigger asChild>
              <button
                type="button"
                data-testid="note-panel-color-dot"
                aria-label="Color"
                className="flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn('size-2.5 rounded-full', NOTE_COLOR_CLASSES[note.color].swatch)}
                />
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
        <span data-testid="note-panel-breadcrumb" className="text-xs text-subtle-foreground">
          {note.onCanvas ? 'Note' : 'Note · not on canvas'}
        </span>
      </div>
      <div className="flex items-center gap-0.5 [&>*]:[-webkit-app-region:no-drag]">
        <IconButton
          data-testid="note-panel-full"
          icon={full ? IconArrowsDiagonalMinimize2 : IconArrowsDiagonal}
          label={full ? 'Back to side panel' : 'Full page'}
          shortcut={shortcutLabel(PANEL_SHORTCUTS.fullPage)}
          onClick={() => useUiStore.getState().setPanelMode(full ? 'side' : 'full')}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton data-testid="note-panel-menu" icon={IconDots} label="More" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem data-testid="note-panel-duplicate" onSelect={duplicate}>
              <IconCopy stroke={1.75} />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="note-panel-delete"
              variant="destructive"
              onSelect={remove}
            >
              <IconTrash stroke={1.75} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton
          data-testid="note-panel-close"
          icon={IconX}
          label="Close"
          shortcut="Esc"
          onClick={() => useUiStore.getState().closeNote()}
        />
      </div>
    </header>
  )
}
