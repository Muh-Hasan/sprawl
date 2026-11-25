import { lazy, Suspense, useEffect, useRef } from 'react'
import { matchesShortcut, PANEL_SHORTCUTS } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useNoteStore } from '@/stores/noteStore'
import { useUiStore } from '@/stores/uiStore'
import { MetaSection } from './MetaSection'
import { NoteTitle } from './NoteTitle'
import { PanelFooter } from './PanelFooter'
import { PanelHeader } from './PanelHeader'

/** BlockNote loads the first time a panel opens, never at startup (ARCHITECTURE §6). */
const Editor = lazy(() => import('./Editor'))

const OPEN_LAYERS = ['dialog', 'menu', 'listbox']
  .map((role) => `[data-radix-popper-content-wrapper] [role="${role}"][data-state="open"]`)
  .join(', ')

/** Something else that owns Esc is open: a popover, a menu, a select list or a dialog. */
function escOwnedElsewhere(e: KeyboardEvent): boolean {
  if (e.defaultPrevented) {
    // BlockNote handles Esc twice over: with one of its menus open it closes the menu (the
    // editor keeps focus); otherwise it just blurs the editor, and Esc is ours to step back.
    const fromEditor = e.target instanceof Element && e.target.closest('.bn-editor') !== null
    const blurred = !document.activeElement?.closest('.bn-editor')
    return !(fromEditor && blurred)
  }
  const target = e.target instanceof Element ? e.target : null
  const layer = target?.closest(
    '[role="dialog"], [role="menu"], [role="listbox"], [role="alertdialog"]',
  )
  // Focus stays in a closing popover until its exit animation ends; that one is done with Esc.
  if (layer && layer.getAttribute('data-state') !== 'closed') return true
  // An open popover, menu or select (not a tooltip, and not one playing its closing animation).
  return document.querySelector(OPEN_LAYERS) !== null
}

/**
 * Panel keys (PRODUCT §4): Ctrl+Shift+Enter toggles full page; Esc steps back, full page →
 * side panel → closed, after any open menu or popover has had it.
 */
function usePanelKeys(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const ui = useUiStore.getState()
      if (ui.openNoteId === null) return
      if (matchesShortcut(e, PANEL_SHORTCUTS.fullPage)) {
        e.preventDefault()
        ui.setPanelMode(ui.panelMode === 'full' ? 'side' : 'full')
      } else if (matchesShortcut(e, PANEL_SHORTCUTS.close)) {
        if (escOwnedElsewhere(e)) return
        e.preventDefault()
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        ui.stepBack()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/**
 * Holds the open note in the note store (shared with a card being written in), and saves on
 * window blur and unload. Releasing it on close or switch saves what's pending.
 */
function useOpenNote(id: string | null): void {
  useEffect(() => {
    if (id === null) return
    const notes = useNoteStore.getState()
    void notes.acquire(id)
    return () => notes.release(id)
  }, [id])
  useEffect(() => {
    const flush = (): void => useNoteStore.getState().flush()
    window.addEventListener('blur', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('blur', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])
}

/**
 * The note panel (UI_SPEC §5): header, title, the BlockNote body and the meta section, with
 * the save status in the footer. In full-page mode it covers the main area (everything but the
 * rail) with the content in a centered 720px column; it stays the same element, so the editor
 * keeps its place.
 */
export function NotePanel() {
  const id = useUiStore((s) => s.openNoteId)
  const full = useUiStore((s) => s.panelMode === 'full')
  const note = useNoteStore((s) => s.note)
  const body = useRef<HTMLDivElement>(null)
  useOpenNote(id)
  usePanelKeys()

  const ready = note !== null && note.id === id
  const focusBody = (): void => {
    body.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus()
  }

  return (
    <aside
      data-testid="note-panel"
      data-note-panel
      data-mode={full ? 'full' : 'side'}
      data-note-id={ready ? note.id : undefined}
      aria-label="Note"
      onBlur={(e) => {
        // Focus left the panel: save now rather than in 500ms.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          useNoteStore.getState().flush()
      }}
      className={cn(
        // The resize handle is the panel's left border (UI_SPEC §5).
        'flex flex-col bg-surface',
        full ? 'fixed inset-y-0 right-0 left-[52px] z-30 animate-in fade-in-0' : 'h-full',
      )}
    >
      {ready && (
        <>
          <PanelHeader />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className={cn('px-6', full && 'mx-auto w-full max-w-[720px]')}>
              <NoteTitle onEnter={focusBody} />
              <div ref={body} className="mt-4 min-h-24">
                <Suspense fallback={<div data-testid="note-editor-loading" className="h-24" />}>
                  <Editor key={note.id} bodyJson={note.bodyJson} />
                </Suspense>
              </div>
              <MetaSection />
            </div>
          </div>
          <PanelFooter />
        </>
      )}
    </aside>
  )
}
