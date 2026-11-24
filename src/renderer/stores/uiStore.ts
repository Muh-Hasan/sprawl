import { create } from 'zustand'

/** The main views reachable from the rail (UI_SPEC §2). */
export const VIEWS = ['canvas', 'list', 'log', 'drawings', 'settings'] as const
export type View = (typeof VIEWS)[number]

interface UiState {
  view: View
  setView(view: View): void
}

export const useUiStore = create<UiState>()((set) => ({
  view: 'canvas',
  setView: (view) => set({ view }),
}))
