import { useState, type ReactNode } from 'react'
import {
  IconArrowDown,
  IconArrowsDiagonal,
  IconArrowsMaximize,
  IconArrowUp,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconCopy,
  IconPin,
  IconPinnedOff,
  IconPlus,
  IconTrash,
  type TablerIcon,
} from '@tabler/icons-react'
import type { NoteColor } from '@shared/constants'
import { ContextMenuContent, ContextMenuItem, MenuShortcut } from '@/components/Menu'
import { ContextMenu, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu'
import { CANVAS_SHORTCUTS, shortcutHint, type Shortcut } from '@/lib/shortcuts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { pinLabel, setNotePinned } from '../note/pinActions'
import {
  createNoteAt,
  createNoteFromText,
  deleteSelection,
  duplicateSelection,
  openSelectedNote,
  restackSelection,
  toggleSelectionDone,
} from './actions'
import { zoomToFit } from './camera'
import { ColorItems } from './MenuColors'
import { screenToWorld, type Point } from './Viewport'

type CardsTarget = {
  kind: 'cards'
  notes: boolean
  single: boolean
  allDone: boolean
  /** The selection's color when every note shares one, ringed in the swatches. */
  color: NoteColor | null
  /** The single selected note's id and whether it's pinned (for Pin / Unpin). */
  pin: { noteId: string; pinned: boolean } | null
}
type Target = CardsTarget | { kind: 'canvas'; at: Point }

/**
 * The right-click menu (UI_SPEC §4.10). On a card it acts on the whole selection (right-clicking
 * an unselected card selects just that one); on empty space it offers to create and paste.
 * Open, Due date… and Pin to sidebar act on a single note; Mark done on every selected note (Mark
 * not done when they're all done, shown with "Show done"). later: phase-8 adds New drawing here.
 */
export function CanvasContextMenu({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null)

  const onContextMenu = (e: React.MouseEvent<HTMLElement>): void => {
    const el = e.target instanceof Element ? e.target : null
    // The toolbar and zoom pill aren't the board; keep the menu (and the native one) away.
    if (el?.closest('[data-canvas-chrome]') || el?.closest('textarea, input')) {
      e.preventDefault()
      return
    }
    const card = el?.closest<HTMLElement>('[data-card-id]')
    const sel = useSelectionStore.getState()
    const { items, viewport } = useCanvasStore.getState()
    const id = card?.dataset.cardId
    if (id && items.has(id)) {
      if (!sel.selected.has(id)) sel.select([id])
      const ids = [...useSelectionStore.getState().selected]
      const notes = ids.every((i) => items.get(i)?.kind === 'note')
      const allDone = notes && ids.every((i) => items.get(i)?.note?.doneAt != null)
      const colors = new Set(ids.map((i) => items.get(i)?.note?.color))
      const color = notes && colors.size === 1 ? ([...colors][0] ?? null) : null
      const single = notes && ids.length === 1
      const only = single ? items.get(ids[0]!) : undefined
      const pin =
        only?.refId && only.note
          ? { noteId: only.refId, pinned: only.note.pinnedAt !== null }
          : null
      setTarget({ kind: 'cards', notes, single, allDone, color, pin })
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    sel.clear()
    setTarget({
      kind: 'canvas',
      at: screenToWorld(viewport, { x: e.clientX - r.left, y: e.clientY - r.top }),
    })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={onContextMenu}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        data-testid="canvas-menu"
        className="w-[260px]"
        // Focus stays where the command put it (say, a new note's title), not back on the board.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {target?.kind === 'cards' && <CardItems {...target} />}
        {target?.kind === 'canvas' && <CanvasItems at={target.at} />}
      </ContextMenuContent>
    </ContextMenu>
  )
}

function Item({
  testId,
  icon: Icon,
  shortcut,
  destructive,
  onSelect,
  children,
}: {
  testId: string
  icon: TablerIcon
  shortcut?: Shortcut | string
  destructive?: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <ContextMenuItem
      data-testid={testId}
      variant={destructive ? 'destructive' : 'default'}
      onSelect={onSelect}
    >
      <Icon stroke={1.75} aria-hidden />
      {children}
      {shortcut && (
        <MenuShortcut>
          {typeof shortcut === 'string' ? shortcut : shortcutHint(shortcut)}
        </MenuShortcut>
      )}
    </ContextMenuItem>
  )
}

function CardItems({ notes, single, allDone, color, pin }: Omit<CardsTarget, 'kind'>) {
  return (
    <>
      {single && (
        <Item
          testId="menu-open"
          icon={IconArrowsDiagonal}
          shortcut={CANVAS_SHORTCUTS.open}
          onSelect={() => openSelectedNote()}
        >
          Open
        </Item>
      )}
      {notes && (
        <>
          <Item
            testId="menu-done"
            icon={IconCheck}
            shortcut={CANVAS_SHORTCUTS.markDone}
            onSelect={toggleSelectionDone}
          >
            {allDone ? 'Mark not done' : 'Mark done'}
          </Item>
          {single && (
            <Item
              testId="menu-due"
              icon={IconCalendar}
              onSelect={() => openSelectedNote({ due: true })}
            >
              Due date…
            </Item>
          )}
          {pin && (
            <Item
              testId="menu-pin"
              icon={pin.pinned ? IconPinnedOff : IconPin}
              onSelect={() => void setNotePinned(pin.noteId, !pin.pinned)}
            >
              {pinLabel(pin.pinned)}
            </Item>
          )}
          <ColorItems current={color} />
          <ContextMenuSeparator />
        </>
      )}
      <Item
        testId="menu-duplicate"
        icon={IconCopy}
        shortcut={CANVAS_SHORTCUTS.duplicate}
        onSelect={duplicateSelection}
      >
        Duplicate
      </Item>
      <Item
        testId="menu-front"
        icon={IconArrowUp}
        shortcut={CANVAS_SHORTCUTS.bringToFront}
        onSelect={() => restackSelection('front')}
      >
        Bring to front
      </Item>
      <Item
        testId="menu-back"
        icon={IconArrowDown}
        shortcut={CANVAS_SHORTCUTS.sendToBack}
        onSelect={() => restackSelection('back')}
      >
        Send to back
      </Item>
      <ContextMenuSeparator />
      <Item
        testId="menu-delete"
        icon={IconTrash}
        shortcut={CANVAS_SHORTCUTS.delete}
        destructive
        onSelect={deleteSelection}
      >
        Delete
      </Item>
    </>
  )
}

function CanvasItems({ at }: { at: Point }) {
  const paste = async (): Promise<void> => {
    const text = await navigator.clipboard.readText()
    if (text.trim()) createNoteFromText(text, at)
  }
  return (
    <>
      <Item
        testId="menu-new-note"
        icon={IconPlus}
        onSelect={() => createNoteAt(at, { edit: true })}
      >
        New note here
      </Item>
      <Item
        testId="menu-paste"
        icon={IconClipboard}
        shortcut="Ctrl V"
        onSelect={() => void paste()}
      >
        Paste
      </Item>
      <ContextMenuSeparator />
      <Item
        testId="menu-fit"
        icon={IconArrowsMaximize}
        shortcut={CANVAS_SHORTCUTS.zoomFit}
        onSelect={zoomToFit}
      >
        Zoom to fit
      </Item>
    </>
  )
}
