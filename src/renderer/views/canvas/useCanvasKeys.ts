import { useEffect } from 'react'
import { CANVAS_SHORTCUTS, isTypingTarget, matchesShortcut } from '@/lib/shortcuts'
import { useCanvasStore } from '@/stores/canvasStore'
import { seedCards, SEED_SHORTCUT } from './devSeed'

/**
 * Canvas keyboard input while the canvas is showing (PRODUCT §4): the tools, zoom, and space
 * for temporary Hand mode. Nothing fires while text is being typed.
 */
export function useCanvasKeys(): void {
  useEffect(() => {
    const store = useCanvasStore
    const onKeyDown = (e: KeyboardEvent): void => {
      if (isTypingTarget(e.target)) return
      const s = store.getState()
      if (e.code === 'Space' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Also keeps a focused toolbar button from being pressed.
        e.preventDefault()
        if (!e.repeat) s.setSpaceHeld(true)
        return
      }
      const run = (fn: () => void): void => {
        e.preventDefault()
        fn()
      }
      if (matchesShortcut(e, CANVAS_SHORTCUTS.zoomIn)) return run(() => s.zoomStep(1))
      if (matchesShortcut(e, CANVAS_SHORTCUTS.zoomOut)) return run(() => s.zoomStep(-1))
      if (matchesShortcut(e, CANVAS_SHORTCUTS.zoomReset)) return run(s.zoomReset)
      if (matchesShortcut(e, CANVAS_SHORTCUTS.zoomFit)) return run(s.zoomToFit)
      if (matchesShortcut(e, CANVAS_SHORTCUTS.toolSelect)) return run(() => s.setTool('select'))
      if (matchesShortcut(e, CANVAS_SHORTCUTS.toolHand)) return run(() => s.setTool('hand'))
      if (import.meta.env.DEV && matchesShortcut(e, SEED_SHORTCUT)) return run(() => seedCards())
    }
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.code === 'Space') store.getState().setSpaceHeld(false)
    }
    // A key released while the window is in the background never sends keyup.
    const onBlur = (): void => store.getState().setSpaceHeld(false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      store.getState().setSpaceHeld(false)
    }
  }, [])
}
