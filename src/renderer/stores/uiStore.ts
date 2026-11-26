import { create } from 'zustand'

/** The main views reachable from the rail (UI_SPEC §2). */
export const VIEWS = ['canvas', 'list', 'log', 'drawings', 'settings'] as const
export type View = (typeof VIEWS)[number]

/** The note panel: a side panel next to the view, or a full page over it (UI_SPEC §5). */
export type PanelMode = 'side' | 'full'

interface UiState {
  view: View
  setView(view: View): void
  /** The note open in the panel, or null when the panel is closed. */
  openNoteId: string | null
  panelMode: PanelMode
  /** The panel should show its due-date picker (the canvas menu's Due date…). */
  duePickerRequested: boolean
  /** The panel showed the picker it was asked for. */
  takeDuePickerRequest(): boolean
  /** The panel should put the cursor in the title once the note shows (a new list note). */
  titleFocusRequested: boolean
  takeTitleFocusRequest(): boolean
  /**
   * Opens a note in the panel (side mode if it was closed); `due` also opens its date picker,
   * `focusTitle` puts the cursor in the title.
   */
  openNote(id: string, options?: { due?: boolean; focusTitle?: boolean }): void
  closeNote(): void
  setPanelMode(mode: PanelMode): void
  /** Esc in the panel: full page → side panel → closed (PRODUCT §3.2). */
  stepBack(): void
}

export const useUiStore = create<UiState>()((set, get) => ({
  view: 'canvas',
  setView: (view) => set({ view }),
  openNoteId: null,
  panelMode: 'side',
  duePickerRequested: false,
  takeDuePickerRequest: () => {
    if (!get().duePickerRequested) return false
    set({ duePickerRequested: false })
    return true
  },
  titleFocusRequested: false,
  takeTitleFocusRequest: () => {
    if (!get().titleFocusRequested) return false
    set({ titleFocusRequested: false })
    return true
  },
  openNote: (id, { due = false, focusTitle = false } = {}) =>
    set((s) => ({
      openNoteId: id,
      panelMode: s.openNoteId === null ? 'side' : s.panelMode,
      duePickerRequested: due,
      titleFocusRequested: focusTitle,
    })),
  closeNote: () => set({ openNoteId: null, panelMode: 'side' }),
  setPanelMode: (panelMode) => set({ panelMode }),
  stepBack: () => {
    if (get().panelMode === 'full') set({ panelMode: 'side' })
    else get().closeNote()
  },
}))
