import { lazy, Suspense, useEffect, useMemo } from 'react'
import { PANEL_WIDTH } from '@shared/constants'
import { debounce } from '@/lib/debounce'
import { registerFlush } from '@/lib/flushes'
import { cn } from '@/lib/utils'
import { PANEL_INSET_PX as INSET, useUiStore } from '@/stores/uiStore'
import { PanelResizeHandle } from './PanelResizeHandle'

/**
 * The note panel (with its date picker, menus and the editor behind it) loads the first time a
 * note opens, so none of it weighs on the cold start (ARCHITECTURE §6).
 */
const NotePanel = lazy(() => import('./NotePanel').then((m) => ({ default: m.NotePanel })))

function clampWidth(px: number): number {
  return Math.round(Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, px)))
}

/**
 * The panel width: the saved `panelWidth` setting, changed live while resizing and saved once
 * the drag ends (or 400ms after the last arrow key), never on every pointer move.
 */
function usePanelWidth() {
  const width = useUiStore((s) => s.panelWidth)
  const setWidth = useUiStore((s) => s.setPanelWidth)
  useEffect(() => {
    void window.sprawl.settings.get('panelWidth').then(setWidth)
  }, [setWidth])
  const save = useMemo(
    () => debounce((px: number) => void window.sprawl.settings.set('panelWidth', px), 400),
    [],
  )
  useEffect(() => registerFlush(save.flush), [save])
  return {
    width,
    resize: (px: number) => setWidth(clampWidth(px)),
    save: (px: number, now: boolean) => {
      save(clampWidth(px))
      if (now) save.flush()
    },
  }
}

/**
 * The main area with the note panel floating over its right side (UI_SPEC §5): 12px from the
 * top bar, the right and the bottom, resizable from its left edge. While it's open in side mode,
 * `--canvas-inset-right` holds the width it covers, so the canvas toolbar, the zoom control and
 * the list and log columns center on what's left. Full page covers the whole main area.
 */
export function PanelFrame({ children }: { children: React.ReactNode }) {
  const open = useUiStore((s) => s.openNoteId !== null)
  const full = useUiStore((s) => s.panelMode === 'full')
  const { width, resize, save } = usePanelWidth()
  // One element for every render, so resizing doesn't re-render the editor on each move.
  const panel = useMemo(() => <NotePanel />, [])
  const shown = open && width !== null
  // `100%` resolves where the variable is used: the canvas, the list and the log all span the
  // main area, so a panel squeezed by a narrow window never reports more than it covers.
  const inset = shown ? `calc(min(${width}px, 100% - ${2 * INSET}px) + ${INSET}px)` : undefined

  return (
    <div
      className="relative h-full min-w-0 flex-1"
      style={{ '--canvas-inset-right': inset } as React.CSSProperties}
    >
      {children}
      {shown && (
        <div
          data-testid="note-panel-slot"
          className={cn(
            'absolute z-30',
            full
              ? 'inset-0'
              : 'top-13 right-3 bottom-3 max-w-[calc(100%-24px)] animate-in duration-240 ease-(--ease-out) fade-in-0 slide-in-from-right-4',
          )}
          style={full ? undefined : { width }}
        >
          <Suspense
            fallback={
              <div
                className={cn(
                  'h-full',
                  full
                    ? 'bg-surface'
                    : 'rounded-2xl border border-border bg-card shadow-(--shadow-panel)',
                )}
              />
            }
          >
            {panel}
          </Suspense>
          {!full && (
            <PanelResizeHandle
              width={width}
              onResize={resize}
              onCommit={(px, now) => save(px, now)}
            />
          )}
        </div>
      )}
    </div>
  )
}
