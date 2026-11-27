import { useEffect } from 'react'
import { useUiStore, type FocusTarget } from '@/stores/uiStore'

/**
 * Runs `focus` when the panel is asked to put the cursor in `target` of note `noteId`
 * (`uiStore.openNote`'s `focus`): once the note shows, or straight away if it was already open.
 * `focus` should be stable (a `useCallback`).
 */
export function useFocusRequest(
  noteId: string | undefined,
  target: FocusTarget,
  focus: () => void,
): void {
  useEffect(() => {
    if (noteId === undefined) return
    const take = (): void => {
      if (useUiStore.getState().takeFocusRequest(noteId, target)) focus()
    }
    take()
    return useUiStore.subscribe((s, prev) => {
      if (s.focusRequest !== prev.focusRequest) take()
    })
  }, [noteId, target, focus])
}
