import { create } from 'zustand'
import type { CaptureMode } from '@shared/api'

/** Bumped each time main shows the capture window, with the mode to start in. */
export const useShowStore = create<{ rev: number; mode: CaptureMode }>()(() => ({
  rev: 0,
  mode: 'note',
}))

/** Listens for `capture:show` before React renders, so the first show is never missed. */
export function listenForShow(): void {
  window.sprawl.on('capture:show', ({ mode }) =>
    useShowStore.setState((s) => ({ rev: s.rev + 1, mode })),
  )
}
