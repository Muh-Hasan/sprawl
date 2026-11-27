import {
  IconEye,
  IconEyeOff,
  IconLayoutSidebar,
  IconLayoutDashboard,
  IconListCheck,
  IconMaximize,
  IconNotebook,
  IconPlus,
  IconSettings,
  IconTextDecrease,
  IconTextIncrease,
  IconTextSize,
  type TablerIcon,
} from '@tabler/icons-react'
import type { NoteListRow } from '@shared/types'
import {
  CANVAS_SHORTCUTS,
  NAV_SHORTCUTS,
  shortcutKeys,
  SIDEBAR_SHORTCUT,
  TEXT_SIZE_SHORTCUTS,
} from '@/lib/shortcuts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useTextSizeStore } from '@/stores/textSizeStore'
import { useUiStore, type View } from '@/stores/uiStore'
import { createNoteAt, showNoteOnCanvas, viewCenter, whenCanvasReady } from '@/views/canvas/actions'
import { zoomToFit } from '@/views/canvas/camera'
import { createListNote } from '@/views/list/listActions'
import { matchesWords } from './paletteQuery'

export interface PaletteCommand {
  id: string
  label: string
  icon: TablerIcon
  /** The keys shown on the right, one `kbd` each. */
  keys?: string[]
  /** More words it's found by, e.g. "font" for the text size commands. */
  keywords?: string
  run(): void
}

const ui = () => useUiStore.getState()
const keys = shortcutKeys

/**
 * A new note: on the canvas at the middle of the view (from List, a note with no card, as its
 * New note button makes). With a title, it's made with that title instead of opening for typing.
 */
export function newNote(title = ''): void {
  if (ui().view === 'list') return void createListNote(title)
  whenCanvasReady(() => createNoteAt(viewCenter(), { title, edit: title === '' }))
}

/**
 * Opens a note result in the panel and, if it has a card on show, glides the canvas to it. The
 * glide waits two frames, so it centers in the canvas the opening panel leaves.
 */
export function openNoteResult(row: NoteListRow): void {
  ui().openNote(row.id)
  if (!row.onCanvas || row.doneAt !== null) return
  requestAnimationFrame(() => requestAnimationFrame(() => showNoteOnCanvas(row.id)))
}

const goTo = (view: View) => () => ui().setView(view)

/** The palette's commands (PRODUCT §3.6), in the order they're listed. */
export function paletteCommands({
  showDone,
  sidebarCollapsed,
}: {
  showDone: boolean
  sidebarCollapsed: boolean
}): PaletteCommand[] {
  const textSize = useTextSizeStore.getState()
  return [
    {
      id: 'new-note',
      label: 'New note',
      icon: IconPlus,
      keys: keys(CANVAS_SHORTCUTS.newNote),
      keywords: 'sticky create add',
      run: () => newNote(),
    },
    {
      id: 'go-canvas',
      label: 'Go to canvas',
      icon: IconLayoutDashboard,
      keys: keys(NAV_SHORTCUTS.canvas),
      keywords: 'board view',
      run: goTo('canvas'),
    },
    {
      id: 'go-list',
      label: 'Go to list',
      icon: IconListCheck,
      keys: keys(NAV_SHORTCUTS.list),
      keywords: 'due todo tasks view',
      run: goTo('list'),
    },
    {
      id: 'go-log',
      label: 'Go to daily log',
      icon: IconNotebook,
      keys: keys(NAV_SHORTCUTS.log),
      keywords: 'today journal view',
      run: goTo('log'),
    },
    {
      id: 'zoom-fit',
      label: 'Zoom to fit',
      icon: IconMaximize,
      keys: keys(CANVAS_SHORTCUTS.zoomFit),
      keywords: 'canvas all view',
      run: () => whenCanvasReady(zoomToFit),
    },
    {
      id: 'toggle-sidebar',
      label: sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar',
      icon: IconLayoutSidebar,
      keys: keys(SIDEBAR_SHORTCUT),
      keywords: 'toggle sidebar hide show navigation rail',
      run: () => useSidebarStore.getState().toggle(),
    },
    {
      id: 'show-done',
      label: showDone ? 'Hide done notes' : 'Show done notes',
      icon: showDone ? IconEyeOff : IconEye,
      keywords: 'toggle completed finished',
      run: () => useCanvasStore.getState().setShowDone(!showDone),
    },
    {
      id: 'text-bigger',
      label: 'Make text bigger',
      icon: IconTextIncrease,
      keys: keys(TEXT_SIZE_SHORTCUTS.bigger),
      keywords: 'text size font larger zoom',
      run: () => textSize.step(1),
    },
    {
      id: 'text-smaller',
      label: 'Make text smaller',
      icon: IconTextDecrease,
      keys: keys(TEXT_SIZE_SHORTCUTS.smaller),
      keywords: 'text size font zoom',
      run: () => textSize.step(-1),
    },
    {
      id: 'text-reset',
      label: 'Reset text size',
      icon: IconTextSize,
      keys: keys(TEXT_SIZE_SHORTCUTS.reset),
      keywords: 'font default zoom',
      run: () => textSize.set('default'),
    },
    {
      id: 'settings',
      label: 'Open settings',
      icon: IconSettings,
      keys: keys(NAV_SHORTCUTS.settings),
      keywords: 'preferences options',
      run: goTo('settings'),
    },
  ]
}

/** The commands whose label or keywords match `term`. */
export function matchCommands(commands: PaletteCommand[], term: string): PaletteCommand[] {
  return commands.filter((c) => matchesWords(`${c.label} ${c.keywords ?? ''}`, term))
}
