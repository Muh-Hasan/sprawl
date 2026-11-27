/**
 * Padding for a view's content while the note panel floats over its right side (UI_SPEC §5):
 * `--canvas-inset-right` is the width the panel covers, set by the panel frame. A centered
 * column (the list, the log) then centers on what's left, and its scrollbar stays visible.
 */
export const PANEL_INSET =
  'pr-[var(--canvas-inset-right,0px)] transition-[padding] duration-240 ease-(--ease-out)'
