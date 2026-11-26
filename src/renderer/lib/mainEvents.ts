import { useCanvasStore } from '@/stores/canvasStore'
import { useListStore } from '@/stores/listStore'
import { useLogStore } from '@/stores/logStore'
import { useUiStore } from '@/stores/uiStore'

/**
 * Main's navigation and data events (ARCHITECTURE §5). Subscribed when the module loads, before
 * React renders, so a deep link sent as soon as the page loads (a toast clicked while Sprawl
 * wasn't running) is never missed. Opening a note only sets state; the shell shows it.
 */
export function listenToMain(): void {
  window.sprawl.on('nav:open-note', ({ id }) => useUiStore.getState().openNote(id))
  window.sprawl.on('nav:open-list-due', () => {
    useListStore.getState().setTab('due')
    useUiStore.getState().setView('list')
  })
  // A capture (from the other window) or a reminder: refetch whatever shows notes.
  window.sprawl.on('data:changed', () => {
    useListStore.getState().changed()
    useLogStore.getState().changed()
    const canvas = useCanvasStore.getState()
    if (canvas.ready) {
      canvas.flush()
      void canvas.load()
    }
  })
}
