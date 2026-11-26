/**
 * Global shortcuts as Electron accelerators (`Ctrl+Shift+Space`), for quick capture
 * (PRODUCT §3.7). The renderer builds one from a key press (the Settings ShortcutRecorder) and
 * main registers it with `globalShortcut`. Both check it with `isValidAccelerator`.
 */

/** Modifiers in the order an accelerator lists them. */
export const MODIFIERS = ['Ctrl', 'Alt', 'Shift', 'Super'] as const
type Modifier = (typeof MODIFIERS)[number]

/** `KeyboardEvent.code` → accelerator key, for the keys that aren't letters, digits or F-keys. */
const CODE_KEYS: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  NumpadEnter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
}

const KEYS = new Set(Object.values(CODE_KEYS))

function isKey(key: string): boolean {
  return /^[A-Z0-9]$/.test(key) || /^F([1-9]|1\d|2[0-4])$/.test(key) || KEYS.has(key)
}

/**
 * True for `Mod+…+Key`: known modifiers, each once and in order, then one key. It needs Ctrl,
 * Alt or Super: Shift plus a key alone would swallow a typed capital letter in every app.
 */
export function isValidAccelerator(accel: string): boolean {
  const parts = accel.split('+')
  // "Ctrl++" names the plus key; Sprawl records Equal instead, so a trailing "+" isn't valid.
  const key = parts.pop()
  if (!key || !isKey(key)) return false
  if (parts.length === 0) return false
  const order = parts.map((p) => MODIFIERS.indexOf(p as Modifier))
  if (order.some((i) => i < 0)) return false
  if (order.some((i, n) => n > 0 && i <= order[n - 1]!)) return false
  return parts.some((p) => p !== 'Shift')
}

/** The accelerator key for a `KeyboardEvent.code`, or null for a modifier or an unknown key. */
export function keyOfCode(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1]!
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code)
  if (digit) return digit[1]!
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code
  return CODE_KEYS[code] ?? null
}

/** The parts of a `KeyboardEvent` an accelerator is built from. */
export interface KeyPress {
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

/**
 * The accelerator for a key press, or null while only modifiers are held (or the key can't be
 * used). The result may still fail `isValidAccelerator` (no modifier, or Shift alone).
 */
export function acceleratorFromEvent(e: KeyPress): string | null {
  const key = keyOfCode(e.code)
  if (key === null) return null
  const mods: Modifier[] = []
  if (e.ctrlKey) mods.push('Ctrl')
  if (e.altKey) mods.push('Alt')
  if (e.shiftKey) mods.push('Shift')
  if (e.metaKey) mods.push('Super')
  return [...mods, key].join('+')
}

/** The keys of an accelerator, for showing as `kbd`s ("Win" for Super). */
export function acceleratorKeys(accel: string): string[] {
  return accel.split('+').map((k) => (k === 'Super' ? 'Win' : k))
}
