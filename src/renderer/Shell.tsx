import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { PANEL_WIDTH } from '@shared/constants'
import { Rail } from '@/components/Rail'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { debounce } from '@/lib/debounce'
import { registerFlush } from '@/lib/flushes'
import { matchesShortcut, NAV_SHORTCUTS } from '@/lib/shortcuts'
import { useUiStore, type View } from '@/stores/uiStore'
import { Canvas } from '@/views/canvas/Canvas'
import { DrawingsGrid } from '@/views/drawings/DrawingsGrid'
import { ListView } from '@/views/list/ListView'
import { LogView } from '@/views/log/LogView'
import { SettingsView } from '@/views/settings/SettingsView'

/**
 * The note panel (with its date picker, menus and the editor behind it) loads the first time a
 * note opens, so none of it weighs on the cold start (ARCHITECTURE §6).
 */
const NotePanel = lazy(() =>
  import('@/views/note/NotePanel').then((m) => ({ default: m.NotePanel })),
)

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

/** The saved panel width (the `panelWidth` setting), and a debounced save for drags. */
function usePanelWidth(): { width: number | null; save: (px: number) => void } {
  const [width, setWidth] = useState<number | null>(null)
  useEffect(() => {
    void window.sprawl.settings.get('panelWidth').then(setWidth)
  }, [])
  const save = useMemo(
    () =>
      debounce((px: number) => {
        const clamped = Math.round(Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, px)))
        setWidth(clamped)
        void window.sprawl.settings.set('panelWidth', clamped)
      }, 400),
    [],
  )
  useEffect(() => registerFlush(save.flush), [save])
  return { width, save }
}

/**
 * The app frame (UI_SPEC §1): the rail on the left, the current view, and the note panel on
 * the right when a note is open (resizable from 320 to 720px through the shadcn handle).
 */
export function Shell() {
  const view = useUiStore((s) => s.view)
  const panelOpen = useUiStore((s) => s.openNoteId !== null)
  const { width, save } = usePanelWidth()
  useNavShortcuts()
  const ViewComponent = VIEW_COMPONENTS[view]
  return (
    <div data-testid="shell" className="flex h-full">
      <Rail />
      <ResizablePanelGroup orientation="horizontal" className="min-w-0 flex-1">
        <ResizablePanel id="view-slot" minSize={320} className="h-full">
          <main
            key={view}
            data-testid={`view-${view}`}
            className="h-full min-w-0 animate-in duration-[260ms] fade-in-0"
          >
            <ViewComponent />
          </main>
        </ResizablePanel>
        {panelOpen && width !== null && (
          <>
            <ResizableHandle
              data-testid="note-panel-handle"
              className="transition-colors after:w-1.5 hover:bg-border-strong data-[separator=active]:bg-border-strong"
            />
            <ResizablePanel
              id="note-panel-slot"
              defaultSize={width}
              minSize={PANEL_WIDTH.min}
              maxSize={PANEL_WIDTH.max}
              groupResizeBehavior="preserve-pixel-size"
              onResize={(size, _id, prev) => prev && save(size.inPixels)}
              className="h-full"
            >
              <Suspense fallback={<div className="h-full bg-surface" />}>
                <NotePanel />
              </Suspense>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
