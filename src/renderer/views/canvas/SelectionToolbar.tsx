import { useSyncExternalStore } from 'react'
import { IconCopy, IconStackBack, IconStackFront, IconTrash } from '@tabler/icons-react'
import { NOTE_COLORS, type NoteColor } from '@shared/constants'
import { HintTooltip } from '@/components/HintTooltip'
import { IconButton } from '@/components/IconButton'
import { COLOR_NAMES, NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { CANVAS_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { deleteSelection, duplicateSelection, restackSelection, setSelectionColor } from './actions'
import { heightsVersion, renderedRect, subscribeHeights } from './measure'
import { boundsOf, worldToScreen, type Rect } from './Viewport'

/** Space between the selection and the toolbar, in screen px (clears the outline). */
const GAP = 14
/** Below this, there's no room above the selection: the 44px top bar sits there. */
const MIN_TOP = 56
const TOOLBAR_H = 40

/** The selection's bounds on screen, or null when there's nothing to show it for. */
function useSelectionScreenBox(): { box: Rect; colors: Set<NoteColor> } | null {
  const selected = useSelectionStore((s) => s.selected)
  const busy = useSelectionStore((s) => s.gesture !== null || s.marquee !== null)
  const transient = useSelectionStore((s) => s.transient)
  const items = useCanvasStore((s) => s.items)
  const viewport = useCanvasStore((s) => s.viewport)
  useSyncExternalStore(subscribeHeights, heightsVersion)
  if (selected.size === 0 || busy) return null

  const rects: Rect[] = []
  const colors = new Set<NoteColor>()
  for (const id of selected) {
    const item = items.get(id)
    if (!item?.note) return null // later: phase-7/8 cards get their own (or no) toolbar
    colors.add(item.note.color)
    rects.push(renderedRect(item, transient?.get(id) ?? item))
  }
  const bounds = boundsOf(rects)
  if (!bounds) return null
  const tl = worldToScreen(viewport, bounds)
  const box = { x: tl.x, y: tl.y, w: bounds.w * viewport.zoom, h: bounds.h * viewport.zoom }
  return { box, colors }
}

/**
 * The floating toolbar over selected notes (FigJam-style): the six colors, Duplicate, Bring to
 * front, Send to back and Delete.
 * It sits centered above the selection, or below it when there's no room above, and hides while
 * a move, resize or marquee is under way.
 */
export function SelectionToolbar() {
  const state = useSelectionScreenBox()
  const width = useCanvasStore((s) => s.size.width)
  if (!state) return null
  const { box, colors } = state
  const above = box.y - GAP - TOOLBAR_H >= MIN_TOP
  const top = above ? box.y - GAP - TOOLBAR_H : box.y + box.h + GAP
  const left = Math.min(Math.max(box.x + box.w / 2, 180), Math.max(180, width - 180))
  const current = colors.size === 1 ? [...colors][0] : undefined

  return (
    <div
      data-testid="selection-toolbar"
      data-canvas-chrome
      role="toolbar"
      aria-label="Selected notes"
      className="absolute z-10 flex h-11 -translate-x-1/2 animate-in items-center gap-0.5 rounded-card border border-border bg-card p-1 shadow-(--shadow-popover) duration-120 fade-in-0"
      style={{ left, top }}
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
      <div aria-hidden className="mx-1 h-4 w-px bg-border" />
      <IconButton
        data-testid="selection-duplicate"
        icon={IconCopy}
        label="Duplicate"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.duplicate)}
        onClick={duplicateSelection}
      />
      <IconButton
        data-testid="selection-front"
        icon={IconStackFront}
        label="Bring to front"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.bringToFront)}
        onClick={() => restackSelection('front')}
      />
      <IconButton
        data-testid="selection-back"
        icon={IconStackBack}
        label="Send to back"
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.sendToBack)}
        onClick={() => restackSelection('back')}
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
