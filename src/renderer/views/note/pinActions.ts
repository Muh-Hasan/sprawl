import { IconPin, IconPinnedOff } from '@tabler/icons-react'
import { showToast } from '@/components/toasts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useListStore } from '@/stores/listStore'
import { useNoteStore } from '@/stores/noteStore'
import { useSidebarStore } from '@/stores/sidebarStore'

/** The menu item's label for a note that is (or isn't) pinned. */
export const pinLabel = (pinned: boolean): string =>
  pinned ? 'Unpin from sidebar' : 'Pin to sidebar'

/**
 * Pins a note to the sidebar's Pinned list, or unpins it (PRODUCT §3.1), from the card menu, the
 * panel menu or a List row. The open panel and the note's card follow. With the sidebar
 * collapsed there's nothing to see it in, so a toast says so.
 */
export async function setNotePinned(id: string, pinned: boolean): Promise<void> {
  // A new card's note may still be in the canvas's queued batch; it has to reach main first.
  useCanvasStore.getState().flush()
  const saved = await window.sprawl.notes.setPinned(id, pinned)
  const note = useNoteStore.getState().note
  if (note?.id === id) useNoteStore.setState({ note: { ...note, pinnedAt: saved.pinnedAt } })
  useCanvasStore.getState().syncNote(id, { pinnedAt: saved.pinnedAt })
  useListStore.getState().changed()
  if (useSidebarStore.getState().collapsed) {
    showToast(pinned ? 'Pinned to the sidebar' : 'Unpinned from the sidebar', {
      icon: pinned ? IconPin : IconPinnedOff,
    })
  }
}
