import { create } from 'zustand'

/** The main views reachable from the sidebar (UI_SPEC §2). */
export const VIEWS = ['canvas', 'list', 'log', 'settings'] as const
export type View = (typeof VIEWS)[number]

/** The note panel: a side panel floating over the view, or a full page over it (UI_SPEC §5). */
export type PanelMode = 'side' | 'full'

/** Where the panel can put the cursor when it opens a note. */
export type FocusTarget = 'title' | 'body'

interface UiState {
  view: View
  setView(view: View): void
  /** The note open in the panel, or null when the panel is closed. */
  openNoteId: string | null
  panelMode: PanelMode
  /** The side panel's width in px (the `panelWidth` setting), or null until it's loaded. */
  panelWidth: number | null
  setPanelWidth(px: number): void
  /** The panel should show its due-date picker (the canvas menu's Due date…). */
  duePickerRequested: boolean
  /** The panel showed the picker it was asked for. */
  takeDuePickerRequest(): boolean
  /**
   * Where the panel should put the cursor once the note shows: the title (a new list note) or
   * the end of the body (a note opened from the canvas).
   */
  focusRequest: { noteId: string; target: FocusTarget } | null
  /** True once: the panel's `target` for note `noteId` is to take the cursor. */
  takeFocusRequest(noteId: string, target: FocusTarget): boolean
  /**
   * Opens a note in the panel (side mode if it was closed); `due` also opens its date picker,
   * `focus` puts the cursor in the title or the body.
   */
  openNote(id: string, options?: { due?: boolean; focus?: FocusTarget }): void
  closeNote(): void
  setPanelMode(mode: PanelMode): void
  /** Esc in the panel: full page → side panel → closed (PRODUCT §3.2). */
  stepBack(): void
  /** The command palette (Ctrl+K) is showing. */
  paletteOpen: boolean
  setPaletteOpen(open: boolean): void
}

export const useUiStore = create<UiState>()((set, get) => ({
  view: 'canvas',
  setView: (view) => set({ view }),
  openNoteId: null,
  panelMode: 'side',
  panelWidth: null,
  setPanelWidth: (panelWidth) => set({ panelWidth }),
  duePickerRequested: false,
  takeDuePickerRequest: () => {
    if (!get().duePickerRequested) return false
    set({ duePickerRequested: false })
    return true
  },
  focusRequest: null,
  takeFocusRequest: (noteId, target) => {
    const request = get().focusRequest
    if (request?.noteId !== noteId || request.target !== target) return false
    set({ focusRequest: null })
    return true
  },
  openNote: (id, { due = false, focus } = {}) =>
    set((s) => ({
      openNoteId: id,
      panelMode: s.openNoteId === null ? 'side' : s.panelMode,
      duePickerRequested: due,
      focusRequest: focus ? { noteId: id, target: focus } : null,
    })),
  closeNote: () => set({ openNoteId: null, panelMode: 'side' }),
  setPanelMode: (panelMode) => set({ panelMode }),
  stepBack: () => {
    if (get().panelMode === 'full') set({ panelMode: 'side' })
    else get().closeNote()
  },
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}))

/** The gap between the floating panel and the main area's edges (UI_SPEC §5). */
export const PANEL_INSET_PX = 12

/**
 * How much of the view's right side the open side panel covers (its width plus the 12px gap),
 * within a view `viewWidth` wide; 0 while it's closed or full page.
 */
export function panelCover(viewWidth: number): number {
  const { openNoteId, panelMode, panelWidth } = useUiStore.getState()
  if (openNoteId === null || panelMode !== 'side' || panelWidth === null) return 0
  return Math.max(0, Math.min(panelWidth, viewWidth - 2 * PANEL_INSET_PX) + PANEL_INSET_PX)
}
