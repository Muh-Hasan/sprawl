import { useEffect } from 'react'
import { isTypingTarget, matchesShortcut, SHEET_SHORTCUT } from '@/lib/shortcuts'
import { useUiStore } from '@/stores/uiStore'

/** `?` opens the sheet, or closes it again, whenever nothing is being typed. */
export function useSheetShortcut(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!matchesShortcut(e, SHEET_SHORTCUT) || isTypingTarget(e.target)) return
      e.preventDefault()
      if (e.repeat) return
      const { shortcutsOpen, setShortcutsOpen } = useUiStore.getState()
      setShortcutsOpen(!shortcutsOpen)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
