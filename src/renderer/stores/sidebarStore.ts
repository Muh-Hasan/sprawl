import { create } from 'zustand'

interface SidebarState {
  /** Collapsed to the 60px icon rail (UI_SPEC §2). */
  collapsed: boolean
  /** The saved choice has been read, so the shell can lay out at its real width. */
  loaded: boolean
  /** Reads the saved choice (once, from App). */
  load(): Promise<void>
  /** Collapses or expands it, and saves the choice (Settings → Appearance). */
  setCollapsed(collapsed: boolean): void
  /** Flips it (Ctrl+\). */
  toggle(): void
}

/** The sidebar's collapsed state, remembered in the `sidebarCollapsed` machine setting. */
export const useSidebarStore = create<SidebarState>()((set, get) => ({
  collapsed: false,
  loaded: false,
  load: async () => {
    if (get().loaded) return
    const collapsed = await window.sprawl.settings.get('sidebarCollapsed').catch(() => false)
    if (!get().loaded) set({ collapsed, loaded: true })
  },
  setCollapsed: (collapsed) => {
    set({ collapsed, loaded: true })
    void window.sprawl.settings.set('sidebarCollapsed', collapsed)
  },
  toggle: () => get().setCollapsed(!get().collapsed),
}))
