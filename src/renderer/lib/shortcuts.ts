/**
 * Keyboard shortcuts match on the physical key (`KeyboardEvent.code`) plus modifiers, not on
 * `key`, so Shift+1 is `Digit1` with Shift even though it types `!` (ARCHITECTURE §6).
 */
export interface Shortcut {
  /** One or more `KeyboardEvent.code` values, e.g. ['Digit1', 'Numpad1']. */
  codes: readonly string[]
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
}

type KeyLike = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>

export function matchesShortcut(e: KeyLike, s: Shortcut): boolean {
  return (
    s.codes.includes(e.code) &&
    e.ctrlKey === Boolean(s.ctrl) &&
    !e.metaKey &&
    e.shiftKey === Boolean(s.shift) &&
    e.altKey === Boolean(s.alt)
  )
}

/** True while the user is typing, so single-key shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const digit = (n: number): Shortcut => ({ codes: [`Digit${n}`, `Numpad${n}`], ctrl: true })

/** View navigation (PRODUCT §4). */
export const NAV_SHORTCUTS = {
  canvas: digit(1),
  list: digit(2),
  log: digit(3),
  drawings: digit(4),
} as const

/** The label shown in tooltips, e.g. "Ctrl+1". */
export function shortcutLabel(s: Shortcut): string {
  const code = s.codes[0] ?? ''
  const name = CODE_LABELS[code] ?? code.replace(/^(Digit|Numpad|Key)/, '')
  return [s.ctrl && 'Ctrl', s.shift && 'Shift', s.alt && 'Alt', name].filter(Boolean).join('+')
}

const CODE_LABELS: Record<string, string> = {
  Equal: '=',
  Minus: '-',
  BracketLeft: '[',
  BracketRight: ']',
  Delete: 'Del',
}

const key = (code: string): Shortcut => ({ codes: [code] })

/** Note panel shortcuts (PRODUCT §4). */
export const PANEL_SHORTCUTS = {
  fullPage: { codes: ['Enter', 'NumpadEnter'], ctrl: true, shift: true },
  markDone: { codes: ['Enter', 'NumpadEnter'], ctrl: true },
  close: key('Escape'),
} as const satisfies Record<string, Shortcut>

/** Daily log shortcuts (PRODUCT §4): the same keys as restacking on the canvas. */
export const LOG_SHORTCUTS = {
  prevDay: { codes: ['BracketLeft'], ctrl: true },
  nextDay: { codes: ['BracketRight'], ctrl: true },
} as const satisfies Record<string, Shortcut>

/** Canvas shortcuts (PRODUCT §4). Single-key tools only fire when nothing is being typed. */
export const CANVAS_SHORTCUTS = {
  toolSelect: key('KeyV'),
  toolHand: key('KeyH'),
  toolNote: key('KeyN'),
  newNote: { codes: ['KeyN'], ctrl: true },
  undo: { codes: ['KeyZ'], ctrl: true },
  redo: { codes: ['KeyZ'], ctrl: true, shift: true },
  selectAll: { codes: ['KeyA'], ctrl: true },
  duplicate: { codes: ['KeyD'], ctrl: true },
  bringToFront: { codes: ['BracketRight'], ctrl: true },
  sendToBack: { codes: ['BracketLeft'], ctrl: true },
  delete: { codes: ['Delete', 'Backspace'] },
  open: { codes: ['Enter', 'NumpadEnter'] },
  markDone: { codes: ['Enter', 'NumpadEnter'], ctrl: true },
  clear: key('Escape'),
  zoomIn: { codes: ['Equal', 'NumpadAdd'], ctrl: true },
  zoomOut: { codes: ['Minus', 'NumpadSubtract'], ctrl: true },
  zoomReset: { codes: ['Digit0', 'Numpad0'], ctrl: true },
  zoomFit: { codes: ['Digit1'], shift: true },
} as const satisfies Record<string, Shortcut>
