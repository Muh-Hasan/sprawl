import { useSyncExternalStore } from 'react'
import { IconArrowsDiagonal, IconCheck, IconCopy, IconTrash } from '@tabler/icons-react'
import { NOTE_COLORS, type NoteColor } from '@shared/constants'
import { HintTooltip } from '@/components/HintTooltip'
import { IconButton } from '@/components/IconButton'
import { COLOR_NAMES, NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { CANVAS_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import {
  deleteSelection,
  duplicateSelection,
  openSelectedNote,
  setSelectionColor,
  toggleSelectionDone,
} from './actions'
import { heightsVersion, renderedRect, subscribeHeights } from './measure'
import { boundsOf, worldToScreen, type Rect } from './Viewport'

/** Space between the selection and the toolbar, in screen px (clears the outline). */
const GAP = 14
/** Below this, there's no room above the selection: the 44px top bar sits there. */
const MIN_TOP = 56
const TOOLBAR_H = 44
/** Half the toolbar's widest width plus a margin: its center stays this far inside the canvas. */
const HALF_W = 190

interface SelectionState {
  box: Rect
  colors: Set<NoteColor>
  count: number
  allDone: boolean
}

/** The selection's bounds on screen, or null when there's nothing to show it for. */
function useSelectionScreenBox(): SelectionState | null {
  const selected = useSelectionStore((s) => s.selected)
  const busy = useSelectionStore((s) => s.gesture !== null || s.marquee !== null)
  const transient = useSelectionStore((s) => s.transient)
  const items = useCanvasStore((s) => s.items)
  const viewport = useCanvasStore((s) => s.viewport)
  useSyncExternalStore(subscribeHeights, heightsVersion)
  if (selected.size === 0 || busy) return null

  const rects: Rect[] = []
  const colors = new Set<NoteColor>()
  let allDone = true
  for (const id of selected) {
    const item = items.get(id)
    if (!item?.note) return null // later: phase-7/8 cards get their own (or no) toolbar
    colors.add(item.note.color)
    if (item.note.doneAt === null) allDone = false
    rects.push(renderedRect(item, transient?.get(id) ?? item))
  }
  const bounds = boundsOf(rects)
  if (!bounds) return null
  const tl = worldToScreen(viewport, bounds)
  const box = { x: tl.x, y: tl.y, w: bounds.w * viewport.zoom, h: bounds.h * viewport.zoom }
  return { box, colors, count: selected.size, allDone }
}

function Divider() {
  return <div aria-hidden className="mx-1 h-4 w-px bg-border" />
}

/**
 * The floating toolbar over selected notes (UI_SPEC §4.9, FigJam-style): the six colors, then
 * Open (one note) and Mark done, then Duplicate and Delete. It sits centered above the
 * selection, or below it when there's no room above, and hides while a move, resize or marquee
 * is under way.
 */
export function SelectionToolbar() {
  const state = useSelectionScreenBox()
  const width = useCanvasStore((s) => s.size.width)
  if (!state) return null
  const { box, colors, count, allDone } = state
  const above = box.y - GAP - TOOLBAR_H >= MIN_TOP
  const top = above ? box.y - GAP - TOOLBAR_H : box.y + box.h + GAP
  const left = Math.min(Math.max(box.x + box.w / 2, HALF_W), Math.max(HALF_W, width - HALF_W))
  const current = colors.size === 1 ? [...colors][0] : undefined
  const doneLabel = allDone ? 'Mark not done' : 'Mark done'

  return (
    <div
      data-testid="selection-toolbar"
      data-canvas-chrome
      role="toolbar"
      aria-label={count === 1 ? 'Selected note' : 'Selected notes'}
      className="absolute z-10 flex h-11 -translate-x-1/2 animate-in items-center gap-0.5 rounded-card border border-border bg-card p-1 shadow-(--shadow-popover) duration-120 fade-in-0"
      style={{ left, top }}
      // A click doesn't move focus here: it stays with the canvas (or goes where the button
      // sends it, like Open's note), so typing after a click isn't swallowed by the toolbar.
      // Tab still reaches the buttons.
      onMouseDown={(e) => e.preventDefault()}
    >
      {NOTE_COLORS.map((color) => (
        <HintTooltip key={color} label={COLOR_NAMES[color]}>
          <button
            type="button"
            data-testid={`selection-color-${color}`}
            aria-label={COLOR_NAMES[color]}
            aria-pressed={current === color}
            onClick={() => setSelectionColor(color)}
            className="flex size-8 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span
              className={cn(
                'size-5 rounded-full',
                NOTE_COLOR_CLASSES[color].pickerSwatch,
                current === color && 'ring-2 ring-foreground ring-offset-2 ring-offset-card',
              )}
            />
          </button>
        </HintTooltip>
      ))}
      <Divider />
      {count === 1 && (
        <IconButton
          data-testid="selection-open"
          icon={IconArrowsDiagonal}
          label="Open"
          shortcut="Enter"
          onClick={() => openSelectedNote()}
        />
      )}
      <IconButton
        data-testid="selection-done"
        icon={IconCheck}
        label={doneLabel}
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.markDone)}
        aria-pressed={allDone}
        active={allDone}
        onClick={toggleSelectionDone}
      />
      <Divider />
      <IconButton
        data-testid="selection-duplicate"
        icon={IconCopy}
        label="Duplicate"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.duplicate)}
        onClick={duplicateSelection}
      />
      <IconButton
        data-testid="selection-delete"
        icon={IconTrash}
        label="Delete"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.delete)}
        onClick={deleteSelection}
      />
    </div>
  )
}
