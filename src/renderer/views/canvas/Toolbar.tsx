import {
  IconHandStop,
  IconLink,
  IconNote,
  IconPhotoPlus,
  IconPointer,
  IconScribble,
  type TablerIcon,
} from '@tabler/icons-react'
import { HintTooltip } from '@/components/HintTooltip'
import { Button } from '@/components/ui/button'
import { CANVAS_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useCanvasStore, type CanvasTool } from '@/stores/canvasStore'

interface ToolDef {
  id: string
  label: string
  icon: TablerIcon
  shortcut: string
  /** The tools that work so far; the rest are shown but inert until their phase. */
  tool?: CanvasTool
  /** A dot in the color the next sticky note gets. */
  dot?: boolean
}

const NAV_TOOLS: readonly ToolDef[] = [
  {
    id: 'select',
    label: 'Select',
    icon: IconPointer,
    shortcut: shortcutLabel(CANVAS_SHORTCUTS.toolSelect),
    tool: 'select',
  },
  {
    id: 'hand',
    label: 'Hand',
    icon: IconHandStop,
    shortcut: shortcutLabel(CANVAS_SHORTCUTS.toolHand),
    tool: 'hand',
  },
]

// later: phase-7 Image and Link, phase-8 Drawing.
const CREATE_TOOLS: readonly ToolDef[] = [
  {
    id: 'note',
    label: 'Sticky note',
    icon: IconNote,
    shortcut: shortcutLabel(CANVAS_SHORTCUTS.toolNote),
    tool: 'note',
    dot: true,
  },
  { id: 'drawing', label: 'Drawing', icon: IconScribble, shortcut: 'D' },
  { id: 'image', label: 'Image', icon: IconPhotoPlus, shortcut: 'I' },
  { id: 'link', label: 'Link', icon: IconLink, shortcut: 'L' },
]

/**
 * One 44×44 tool with a 22px icon. The active tool is filled white (`--primary`). A tool that
 * isn't built yet stays focusable with `aria-disabled`, so its tooltip still says what's coming.
 */
function ToolButton({ def }: { def: ToolDef }) {
  const active = useCanvasStore((s) => def.tool !== undefined && s.tool === def.tool)
  const setTool = useCanvasStore((s) => s.setTool)
  const { tool, icon: Icon } = def
  return (
    <HintTooltip
      label={tool ? def.label : `${def.label} · coming soon`}
      shortcut={tool ? def.shortcut : undefined}
      side="top"
    >
      <Button
        data-testid={`tool-${def.id}`}
        variant="ghost"
        aria-label={def.label}
        aria-pressed={tool ? active : undefined}
        aria-disabled={tool ? undefined : true}
        data-active={active || undefined}
        onClick={tool ? () => setTool(tool) : undefined}
        className={cn(
          "relative size-11 rounded-[11px] p-0 text-muted-foreground [&_svg:not([class*='size-'])]:size-[22px]",
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted',
          'data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground dark:data-active:hover:bg-primary',
          'aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground dark:aria-disabled:hover:bg-transparent',
        )}
      >
        <Icon stroke={1.75} />
        {def.dot && (
          <span
            aria-hidden
            data-testid={`tool-${def.id}-dot`}
            className="absolute right-[9px] bottom-[9px] size-2 rounded-[3px] bg-note-stone-swatch ring-2 ring-popover"
          />
        )}
      </Button>
    </HintTooltip>
  )
}

/**
 * The canvas toolbar, bottom center (UI_SPEC §4.2). It centers on the part of the canvas that
 * isn't covered: `--canvas-inset-right` is the width of anything floating over the right edge.
 */
export function Toolbar() {
  return (
    <div
      data-testid="canvas-toolbar"
      data-canvas-chrome
      role="toolbar"
      aria-label="Canvas tools"
      className="absolute bottom-5 left-[calc((100%_-_var(--canvas-inset-right,0px))/2)] z-10 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border bg-popover p-1.5 shadow-(--shadow-toolbar) transition-[left] duration-240 ease-(--ease-out) [-webkit-app-region:no-drag]"
    >
      {NAV_TOOLS.map((def) => (
        <ToolButton key={def.id} def={def} />
      ))}
      <div aria-hidden className="mx-1 h-6 w-px bg-border" />
      {CREATE_TOOLS.map((def) => (
        <ToolButton key={def.id} def={def} />
      ))}
    </div>
  )
}
