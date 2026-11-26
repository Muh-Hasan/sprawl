import { useEffect } from 'react'
import type { NoteListRow } from '@shared/types'
import { isTypingTarget } from '@/lib/shortcuts'

interface ListKeys {
  rows: readonly NoteListRow[]
  cursor: string | null
  setCursor(id: string | null): void
  open(id: string): void
  toggleDone(row: NoteListRow): void
  remove(id: string): void
}

/** A menu, select, dialog or popover is open and owns the keys. */
function layerOpen(): boolean {
  return (
    document.querySelector(
      '[role="menu"][data-state="open"], [role="listbox"][data-state="open"], [role="dialog"][data-state="open"], [role="alertdialog"]',
    ) !== null
  )
}

/**
 * The List view's keys (PRODUCT §3.3): ↑↓ move through the rows, Enter opens, Space toggles
 * done, Delete deletes. Not while typing, inside the note panel, or with a menu open.
 */
export function useListKeys({ rows, cursor, setCursor, open, toggleDone, remove }: ListKeys): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.defaultPrevented) return
      const target = e.target instanceof Element ? e.target : null
      if (isTypingTarget(e.target) || target?.closest('[data-note-panel]') || layerOpen()) return
      const index = rows.findIndex((r) => r.id === cursor)
      const row = index >= 0 ? rows[index] : undefined
      switch (e.code) {
        case 'ArrowDown':
        case 'ArrowUp': {
          if (rows.length === 0) return
          e.preventDefault()
          const step = e.code === 'ArrowDown' ? 1 : -1
          const next = index < 0 ? (step > 0 ? 0 : rows.length - 1) : index + step
          setCursor(rows[Math.max(0, Math.min(rows.length - 1, next))]!.id)
          return
        }
        case 'Enter':
        case 'NumpadEnter':
          if (!row) return
          e.preventDefault()
          open(row.id)
          return
        case 'Space':
          // A focused button or checkbox already does its own thing with Space.
          if (!row || target?.closest('button')) return
          e.preventDefault()
          toggleDone(row)
          return
        case 'Delete':
        case 'Backspace': {
          if (!row) return
          e.preventDefault()
          remove(row.id)
          return
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rows, cursor, setCursor, open, toggleDone, remove])
}
