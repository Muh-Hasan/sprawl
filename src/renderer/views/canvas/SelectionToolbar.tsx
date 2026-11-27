import { useSyncExternalStore } from 'react'
import {
  IconCalendarDue,
  IconCheck,
  IconCopy,
  IconDots,
  IconStackBack,
  IconStackFront,
  IconTrash,
  type TablerIcon,
} from '@tabler/icons-react'
import { NOTE_COLORS, type NoteColor } from '@shared/constants'
import { HintTooltip } from '@/components/HintTooltip'
import { DropdownMenuContent, DropdownMenuItem } from '@/components/Menu'
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { COLOR_NAMES, NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { CANVAS_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import {
  deleteSelection,
  duplicateSelection,
  openSelectedNote,
  restackSelection,
  setSelectionColor,
  toggleSelectionDone,
} from './actions'
import { heightsVersion, renderedRect, subscribeHeights } from './measure'
import { boundsOf, worldToScreen, type Rect } from './Viewport'

/** Space between the selection and the toolbar, in screen px (clears the outline). */
const GAP = 14
/** Below this, there's no room above the selection: the 44px top bar sits there. */
const MIN_TOP = 56
const TOOLBAR_H = 40
/** The toolbar keeps this far from the canvas's left and right edges. */
const EDGE = 8

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

const TEXT_BUTTON =
  'flex h-[30px] items-center gap-1.5 rounded-lg px-2 text-xs text-secondary-foreground/85 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'

function TextButton({
  icon: Icon,
  label,
  tooltip,
  shortcut,
  onClick,
  ...props
}: {
  icon: TablerIcon
  label: string
  tooltip: string
  shortcut?: string
  onClick: () => void
  'data-testid': string
}) {
  return (
    <HintTooltip label={tooltip} shortcut={shortcut}>
      <button type="button" className={TEXT_BUTTON} onClick={onClick} {...props}>
        <Icon className="size-4" stroke={1.75} aria-hidden />
        {label}
      </button>
    </HintTooltip>
  )
}

/** The six colors as 16px dots in the bright hue; the current one has a white ring. */
function Swatches({ current }: { current: NoteColor | undefined }) {
  return (
    <div className="flex px-1">
      {NOTE_COLORS.map((color) => (
        <HintTooltip key={color} label={COLOR_NAMES[color]}>
          <button
            type="button"
            data-testid={`selection-color-${color}`}
            aria-label={COLOR_NAMES[color]}
            aria-pressed={current === color}
            onClick={() => setSelectionColor(color)}
            className="group/swatch flex size-[22px] items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span
              className={cn(
                'size-4 rounded-full transition-transform duration-120 group-hover/swatch:scale-110 motion-reduce:transition-none',
                NOTE_COLOR_CLASSES[color].swatch,
                current === color &&
                  'ring-[1.5px] ring-foreground ring-offset-2 ring-offset-popover',
              )}
            />
          </button>
        </HintTooltip>
      ))}
    </div>
  )
}

/** Duplicate, the stacking order and Delete, behind the toolbar's More button. */
function MoreMenu() {
  return (
    <DropdownMenu>
      <HintTooltip label="More">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="selection-more"
            aria-label="More"
            className={cn(TEXT_BUTTON, 'w-[30px] justify-center px-0')}
          >
            <IconDots className="size-4" stroke={2} aria-hidden />
          </button>
        </DropdownMenuTrigger>
      </HintTooltip>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem data-testid="selection-duplicate" onSelect={duplicateSelection}>
          <IconCopy stroke={1.75} />
          Duplicate
          <DropdownMenuShortcut>{shortcutLabel(CANVAS_SHORTCUTS.duplicate)}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="selection-front" onSelect={() => restackSelection('front')}>
          <IconStackFront stroke={1.75} />
          Bring to front
          <DropdownMenuShortcut>
            {shortcutLabel(CANVAS_SHORTCUTS.bringToFront)}
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="selection-back" onSelect={() => restackSelection('back')}>
          <IconStackBack stroke={1.75} />
          Send to back
          <DropdownMenuShortcut>{shortcutLabel(CANVAS_SHORTCUTS.sendToBack)}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="selection-delete"
          variant="destructive"
          onSelect={deleteSelection}
        >
          <IconTrash stroke={1.75} />
          Delete
          <DropdownMenuShortcut>{shortcutLabel(CANVAS_SHORTCUTS.delete)}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The floating toolbar over selected notes (UI_SPEC §4.9): the six colors, then Due (one note),
 * Done and More (Duplicate, Bring to front, Send to back, Delete). It sits 14px above the
 * selection, lined up with its left edge, or below it when there's no room above, and hides
 * while a move, resize or marquee is under way.
 */
export function SelectionToolbar() {
  const state = useSelectionScreenBox()
  const width = useCanvasStore((s) => s.size.width)
  if (!state) return null
  const { box, colors, count, allDone } = state
  const above = box.y - GAP - TOOLBAR_H >= MIN_TOP
  const top = above ? box.y - GAP - TOOLBAR_H : box.y + box.h + GAP
  const left = Math.min(Math.max(box.x, EDGE), Math.max(EDGE, width - EDGE))
  const current = colors.size === 1 ? [...colors][0] : undefined

  return (
    <div
      data-testid="selection-toolbar"
      data-canvas-chrome
      role="toolbar"
      aria-label={count === 1 ? 'Selected note' : 'Selected notes'}
      className="absolute z-10 flex h-10 animate-in items-center gap-0.5 rounded-card border border-border bg-popover px-1.5 shadow-(--shadow-popover) duration-120 fade-in-0"
      // Near the right edge it slides left by however much it would overflow (a percentage in
      // `translate` is of its own width), but never past its own left edge.
      style={{
        left,
        top,
        translate: `max(-100%, min(0px, calc(${width - EDGE - left}px - 100%)))`,
      }}
    >
      <Swatches current={current} />
      <div aria-hidden className="mx-1 h-5 w-px bg-border" />
      {count === 1 && (
        <TextButton
          data-testid="selection-due"
          icon={IconCalendarDue}
          label="Due"
          tooltip="Due date"
          onClick={() => openSelectedNote({ due: true })}
        />
      )}
      <TextButton
        data-testid="selection-done"
        icon={IconCheck}
        label={allDone ? 'Not done' : 'Done'}
        tooltip={allDone ? 'Mark not done' : 'Mark done'}
        shortcut={shortcutLabel(CANVAS_SHORTCUTS.markDone)}
        onClick={toggleSelectionDone}
      />
      <MoreMenu />
    </div>
  )
}
