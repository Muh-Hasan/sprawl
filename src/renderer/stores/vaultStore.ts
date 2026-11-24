import { create } from 'zustand'
import type { VaultInfo } from '@shared/api'

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
  open: async (path) => set({ info: await window.sprawl.app.openVault(path) }),
  subscribe: () => window.sprawl.on('vault:changed', (info) => set({ info })),
}))
