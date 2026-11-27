import { lazy, Suspense, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { matchesShortcut, NAV_SHORTCUTS, PALETTE_SHORTCUT, SIDEBAR_SHORTCUT } from '@/lib/shortcuts'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useUiStore, type View } from '@/stores/uiStore'
import { Canvas } from '@/views/canvas/Canvas'
import { ListView } from '@/views/list/ListView'
import { PanelFrame } from '@/views/note/PanelFrame'
import { CommandPalette } from '@/views/search/CommandPalette'
import { SettingsView } from '@/views/settings/SettingsView'

/** The daily log isn't the startup view; it (and its calendar and popovers) loads on first use. */
const LogView = lazy(() => import('@/views/log/LogView').then((m) => ({ default: m.LogView })))

const VIEW_COMPONENTS: Record<View, React.ComponentType> = {
  canvas: Canvas,
  list: ListView,
  log: LogView,
  settings: SettingsView,
}

/**
 * Ctrl+1/2/3 and Ctrl+, switch views, and Ctrl+\ collapses or expands the sidebar (PRODUCT §4).
 * They aren't typed characters, so they work anywhere.
 */
function useNavShortcuts(): void {
  const setView = useUiStore((s) => s.setView)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (matchesShortcut(e, SIDEBAR_SHORTCUT)) {
        e.preventDefault()
        if (!e.repeat) useSidebarStore.getState().toggle()
        return
      }
      for (const [view, shortcut] of Object.entries(NAV_SHORTCUTS)) {
        if (matchesShortcut(e, shortcut)) {
          e.preventDefault()
          setView(view as View)
          return
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setView])
}

/**
 * Ctrl+K opens the palette, or closes it again, from anywhere. It's caught on the way down to the
 * note editor, on `document` so the shortcut recorder (on `window`) can still take it.
 */
function usePaletteShortcut(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!matchesShortcut(e, PALETTE_SHORTCUT)) return
      e.preventDefault()
      e.stopPropagation()
      if (e.repeat) return
      const { paletteOpen, setPaletteOpen } = useUiStore.getState()
      setPaletteOpen(!paletteOpen)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [])
}

/**
 * The app frame (UI_SPEC §1): the sidebar on the left and the current view, with the note panel
 * floating over its right side when a note is open. It waits for the saved sidebar width, so the
 * canvas never lays out at the wrong size first.
 */
export function Shell() {
  const view = useUiStore((s) => s.view)
  const sidebarLoaded = useSidebarStore((s) => s.loaded)
  useNavShortcuts()
  usePaletteShortcut()
  const ViewComponent = VIEW_COMPONENTS[view]
  if (!sidebarLoaded) return <div className="h-11 [-webkit-app-region:drag]" />
  return (
    <div data-testid="shell" className="flex h-full">
      <Sidebar />
      <PanelFrame>
        <main
          key={view}
          data-testid={`view-${view}`}
          className="h-full min-w-0 animate-in duration-[260ms] fade-in-0"
        >
          <Suspense fallback={null}>
            <ViewComponent />
          </Suspense>
        </main>
      </PanelFrame>
      <CommandPalette />
    </div>
  )
}
