import {
  CANVAS_SHORTCUTS,
  NAV_SHORTCUTS,
  PALETTE_SHORTCUT,
  PANEL_SHORTCUTS,
  SHEET_SHORTCUT,
  shortcutKeys,
  SIDEBAR_SHORTCUT,
} from '@/lib/shortcuts'

export interface ShortcutRow {
  id: string
  label: string
  /** One `kbd` each. A key that stands for several ("1 2 3") is one entry. */
  keys: readonly string[]
}

export interface ShortcutGroup {
  id: string
  title: string
  rows: readonly ShortcutRow[]
}

const keys = shortcutKeys
/** Several shortcuts that share their modifiers, as one row: Ctrl + "1 2 3". */
const shared = (mods: string[], names: string): string[] => [...mods, names]

/**
 * Every shortcut that works today (PRODUCT §4), grouped as the sheet shows them (UI_SPEC §12).
 * Quick capture's comes from settings, since it can be changed. later: phase-7 (Image, Link
 * tools), phase-8 (New drawing, the Drawing tool), phase-9 (`[[` links).
 */
export function shortcutGroups(captureShortcut: string | null): ShortcutGroup[] {
  return [
    {
      id: 'everywhere',
      title: 'Everywhere',
      rows: [
        { id: 'palette', label: 'Search and commands', keys: keys(PALETTE_SHORTCUT) },
        { id: 'new-note', label: 'New note', keys: keys(CANVAS_SHORTCUTS.newNote) },
        {
          id: 'capture',
          label: 'Quick capture',
          keys: captureShortcut ? captureShortcut.split('+') : [],
        },
        { id: 'views', label: 'Canvas · List · Log', keys: shared(['Ctrl'], '1 2 3') },
        { id: 'sidebar', label: 'Toggle sidebar', keys: keys(SIDEBAR_SHORTCUT) },
        { id: 'text-size', label: 'Text size', keys: shared(['Ctrl', 'Shift'], '+ − 0') },
        { id: 'settings', label: 'Settings', keys: keys(NAV_SHORTCUTS.settings) },
        { id: 'sheet', label: 'This sheet', keys: keys(SHEET_SHORTCUT) },
      ],
    },
    {
      id: 'canvas',
      title: 'Canvas',
      rows: [
        { id: 'tools', label: 'Select · Hand', keys: ['V', 'H'] },
        { id: 'note-tool', label: 'Sticky note', keys: keys(CANVAS_SHORTCUTS.toolNote) },
        { id: 'pan', label: 'Pan', keys: ['Space', 'drag'] },
        { id: 'zoom', label: 'Zoom in · out · reset', keys: shared(['Ctrl'], '+ − 0') },
        { id: 'zoom-fit', label: 'Zoom to fit', keys: keys(CANVAS_SHORTCUTS.zoomFit) },
        { id: 'select-all', label: 'Select all', keys: keys(CANVAS_SHORTCUTS.selectAll) },
        { id: 'duplicate', label: 'Duplicate', keys: keys(CANVAS_SHORTCUTS.duplicate) },
        { id: 'restack', label: 'Front · back', keys: shared(['Ctrl'], '] [') },
        { id: 'undo', label: 'Undo', keys: keys(CANVAS_SHORTCUTS.undo) },
        { id: 'redo', label: 'Redo', keys: keys(CANVAS_SHORTCUTS.redo) },
        { id: 'delete', label: 'Delete', keys: keys(CANVAS_SHORTCUTS.delete) },
      ],
    },
    {
      id: 'notes',
      title: 'Notes and log',
      rows: [
        { id: 'open', label: 'Open selected note', keys: ['Enter'] },
        { id: 'done', label: 'Mark done', keys: keys(PANEL_SHORTCUTS.markDone) },
        { id: 'full-page', label: 'Full page', keys: keys(PANEL_SHORTCUTS.fullPage) },
        { id: 'close', label: 'Close · step back', keys: ['Esc'] },
        { id: 'block-menu', label: 'Block menu', keys: ['/'] },
        { id: 'checklist', label: 'Checklist item', keys: ['[ ]'] },
        { id: 'days', label: 'Previous · next day', keys: shared(['Ctrl'], '[ ]') },
      ],
    },
  ]
}
