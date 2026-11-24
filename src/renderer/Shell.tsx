import { useEffect } from 'react'
import { Rail } from '@/components/Rail'
import { matchesShortcut, NAV_SHORTCUTS } from '@/lib/shortcuts'
import { useUiStore, type View } from '@/stores/uiStore'
import { Canvas } from '@/views/canvas/Canvas'
import { DrawingsGrid } from '@/views/drawings/DrawingsGrid'
import { ListView } from '@/views/list/ListView'
import { LogView } from '@/views/log/LogView'
import { SettingsView } from '@/views/settings/SettingsView'

const VIEW_COMPONENTS: Record<View, () => React.JSX.Element> = {
  canvas: Canvas,
  list: ListView,
  log: LogView,
  drawings: DrawingsGrid,
  settings: SettingsView,
}

/** Ctrl+1/2/3/4 switch views (PRODUCT §4). They aren't typed characters, so they work anywhere. */
function useNavShortcuts(): void {
  const setView = useUiStore((s) => s.setView)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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

/** The app frame (UI_SPEC §1): the rail on the left and the current view. */
export function Shell() {
  const view = useUiStore((s) => s.view)
  useNavShortcuts()
  const ViewComponent = VIEW_COMPONENTS[view]
  return (
    <div data-testid="shell" className="flex h-full">
      <Rail />
      <main
        key={view}
        data-testid={`view-${view}`}
        className="min-w-0 flex-1 animate-in duration-[260ms] fade-in-0"
      >
        <ViewComponent />
      </main>
    </div>
  )
}
