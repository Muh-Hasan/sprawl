import { useEffect } from 'react'
import { CANVAS_SHORTCUTS, isTypingTarget, matchesShortcut, type Shortcut } from '@/lib/shortcuts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useUiStore } from '@/stores/uiStore'
import {
  createNoteAt,
  createNoteFromText,
  deleteSelection,
  duplicateSelection,
  endNudge,
  nudgeSelection,
  openSelectedNote,
  restackSelection,
  selectAll,
  toggleSelectionDone,
  viewCenter,
} from './actions'
import { zoomReset, zoomStep, zoomToFit } from './camera'
import { seedCards, SEED_SHORTCUT } from './devSeed'

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/** Shift+arrow nudges by a grid step. */
const NUDGE_BIG = 8

/**
 * Not for the canvas: typing, keys meant for an open menu or dialog, or anything in the note
 * panel (Delete on a focused panel button mustn't delete the selected card). A menu that's
 * closing (playing its exit animation) can still hold focus; it no longer wants keys.
 */
function ignored(target: EventTarget | null): boolean {
  if (isTypingTarget(target)) return true
  if (!(target instanceof Element)) return false
  return (
    target.closest('[role="menu"][data-state="open"], [role="dialog"], [data-note-panel]') !== null
  )
}

/**
 * Canvas keyboard input while the canvas is showing (PRODUCT §4): tools, zoom, space for
 * temporary Hand mode, the selection commands, undo and redo, and pasting text as a note.
 * Nothing fires while text is being typed.
 */
export function useCanvasKeys(): void {
  useEffect(() => {
    const canvas = useCanvasStore
    const sel = useSelectionStore

    const commands: [Shortcut, () => void][] = [
      [CANVAS_SHORTCUTS.zoomIn, () => zoomStep(1)],
      [CANVAS_SHORTCUTS.zoomOut, () => zoomStep(-1)],
      [CANVAS_SHORTCUTS.zoomReset, zoomReset],
      [CANVAS_SHORTCUTS.zoomFit, zoomToFit],
      [CANVAS_SHORTCUTS.toolSelect, () => canvas.getState().setTool('select')],
      [CANVAS_SHORTCUTS.toolHand, () => canvas.getState().setTool('hand')],
      [CANVAS_SHORTCUTS.toolNote, () => canvas.getState().setTool('note')],
      [CANVAS_SHORTCUTS.newNote, () => createNoteAt(viewCenter(), { edit: true })],
      [CANVAS_SHORTCUTS.undo, () => canvas.getState().undo()],
      [CANVAS_SHORTCUTS.redo, () => canvas.getState().redo()],
      [CANVAS_SHORTCUTS.selectAll, selectAll],
      [CANVAS_SHORTCUTS.duplicate, duplicateSelection],
      [CANVAS_SHORTCUTS.bringToFront, () => restackSelection('front')],
      [CANVAS_SHORTCUTS.sendToBack, () => restackSelection('back')],
      [CANVAS_SHORTCUTS.delete, deleteSelection],
      [CANVAS_SHORTCUTS.open, () => openSelectedNote()],
      [CANVAS_SHORTCUTS.markDone, toggleSelectionDone],
    ]

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || ignored(e.target)) return
      const s = canvas.getState()
      if (e.code === 'Space' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Also keeps a focused toolbar button from being pressed.
        e.preventDefault()
        if (!e.repeat) s.setSpaceHeld(true)
        return
      }
      const arrow = ARROWS[e.code]
      if (arrow && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        const step = e.shiftKey ? NUDGE_BIG : 1
        nudgeSelection(arrow[0] * step, arrow[1] * step)
        return
      }
      if (matchesShortcut(e, CANVAS_SHORTCUTS.clear)) {
        // With the panel open, Esc belongs to it (it steps the panel back).
        if (useUiStore.getState().openNoteId !== null) return
        const { gesture, cancelGesture, clear } = sel.getState()
        if (gesture === 'move' || gesture === 'resize') cancelGesture()
        else if (s.tool === 'note') s.setTool('select')
        else clear()
        return
      }
      for (const [shortcut, fn] of commands) {
        if (!matchesShortcut(e, shortcut)) continue
        e.preventDefault()
        // A held key repeats; repeating a whole command (say, Ctrl+D) is never wanted.
        if (!e.repeat || shortcut === CANVAS_SHORTCUTS.undo || shortcut === CANVAS_SHORTCUTS.redo)
          fn()
        return
      }
      if (import.meta.env.DEV && matchesShortcut(e, SEED_SHORTCUT)) {
        e.preventDefault()
        seedCards()
      }
    }

    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.code === 'Space') canvas.getState().setSpaceHeld(false)
      if (ARROWS[e.code]) endNudge()
    }

    // A key released while the window is in the background never sends keyup.
    const onBlur = (): void => {
      canvas.getState().setSpaceHeld(false)
      endNudge()
    }

    const onPaste = (e: ClipboardEvent): void => {
      if (ignored(e.target) || ignored(document.activeElement)) return
      const text = e.clipboardData?.getData('text/plain')
      if (!text?.trim()) return
      e.preventDefault()
      createNoteFromText(text)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('paste', onPaste)
      canvas.getState().setSpaceHeld(false)
      endNudge()
    }
  }, [])
}
