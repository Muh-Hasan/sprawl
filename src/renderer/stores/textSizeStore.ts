import { create } from 'zustand'
import { DEFAULT_TEXT_SIZE, stepTextSize, TEXT_SIZE_ZOOM, type TextSize } from '@shared/textSize'

interface TextSizeState {
  size: TextSize
  /** Reads the saved size (once, from App). */
  load(): Promise<void>
  /** Shows and saves a size; main zooms every window to it. */
  set(size: TextSize): void
  /** One step bigger or smaller (Ctrl+Shift+= / Ctrl+Shift+-). */
  step(direction: 1 | -1): void
}

/**
 * The app text size (PRODUCT §4). Main applies the zoom factor; the renderer only mirrors it in
 * `--app-zoom`, which keeps the caption-button band its real width (UI_SPEC §1).
 */
export const useTextSizeStore = create<TextSizeState>()((set, get) => ({
  size: DEFAULT_TEXT_SIZE,
  load: async () => {
    const size = await window.sprawl.settings.get('textSize')
    mirror(size)
    set({ size })
  },
  set: (size) => {
    if (size === get().size) return
    mirror(size)
    set({ size })
    void window.sprawl.settings.set('textSize', size)
  },
  step: (direction) => get().set(stepTextSize(get().size, direction)),
}))

function mirror(size: TextSize): void {
  document.documentElement.style.setProperty('--app-zoom', String(TEXT_SIZE_ZOOM[size]))
}
