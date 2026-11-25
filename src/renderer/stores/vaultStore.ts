import { create } from 'zustand'
import { flushAll } from '@/lib/flushes'
import { useUiStore } from './uiStore'
import type { VaultInfo } from '@shared/api'
import { canvasHistory } from './historyStore'

interface VaultState {
  /** Null until the first `getVaultInfo` answers. */
  info: VaultInfo | null
  load(): Promise<void>
  /** Opens (or creates) the vault in `path`. */
  open(path: string): Promise<void>
  /** Follows `vault:changed` from main. Returns the unsubscribe function. */
  subscribe(): () => void
}

export const useVaultStore = create<VaultState>()((set) => ({
  info: null,
  load: async () => set({ info: await window.sprawl.app.getVaultInfo() }),
  open: async (path) => {
    // Pending writes belong to the vault that's open now; IPC keeps them ahead of the switch.
    flushAll()
    set({ info: await window.sprawl.app.openVault(path) })
  },
  subscribe: () =>
    window.sprawl.on('vault:changed', (info) => {
      // Undo steps belong to the vault they were made in.
      canvasHistory.clear()
      useUiStore.getState().closeNote()
      set({ info })
    }),
}))
