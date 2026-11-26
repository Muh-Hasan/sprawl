import {
  IconHandStop,
  IconLink,
  IconNote,
  IconPhotoPlus,
  IconPointer,
  IconScribble,
  type TablerIcon,
} from '@tabler/icons-react'
import { IconButton } from '@/components/IconButton'
import { CANVAS_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { useCanvasStore, type CanvasTool } from '@/stores/canvasStore'

interface ToolDef {
  id: string
  label: string
  icon: TablerIcon
  shortcut: string
  /** The tools that work so far; the rest stay disabled until their phase. */
  tool?: CanvasTool
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

// later: phase-7 Link and Image, phase-8 Drawing.
const CREATE_TOOLS: readonly ToolDef[] = [
  {
    id: 'note',
    label: 'Note',
    icon: IconNote,
    shortcut: shortcutLabel(CANVAS_SHORTCUTS.toolNote),
    tool: 'note',
  },
  { id: 'link', label: 'Link', icon: IconLink, shortcut: 'L' },
  { id: 'drawing', label: 'Drawing', icon: IconScribble, shortcut: 'D' },
  { id: 'image', label: 'Image', icon: IconPhotoPlus, shortcut: 'I' },
]

function ToolButton({ def }: { def: ToolDef }) {
  const active = useCanvasStore((s) => def.tool !== undefined && s.tool === def.tool)
  const setTool = useCanvasStore((s) => s.setTool)
  const { tool } = def
  return (
    <IconButton
      data-testid={`tool-${def.id}`}
      icon={def.icon}
      label={def.label}
      shortcut={def.shortcut}
      active={active}
      aria-pressed={tool ? active : undefined}
      disabled={!tool}
      onClick={tool ? () => setTool(tool) : undefined}
    />
  )
}

/** The floating toolbar, top center (UI_SPEC §4.2). */
export function Toolbar() {
  return (
    <div
      data-testid="canvas-toolbar"
      data-canvas-chrome
      role="toolbar"
      aria-label="Canvas tools"
      className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-card border border-border bg-card p-1 shadow-(--shadow-popover) [-webkit-app-region:no-drag]"
    >
      {NAV_TOOLS.map((def) => (
        <ToolButton key={def.id} def={def} />
      ))}
      <div aria-hidden className="mx-1 h-4 w-px bg-border" />
      {CREATE_TOOLS.map((def) => (
        <ToolButton key={def.id} def={def} />
      ))}
    </div>
  )
}
