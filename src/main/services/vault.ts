import { existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_VAULT_DIR, VAULT_DB_FILE } from '@shared/constants'
import type { VaultInfo } from '@shared/api'
import { openDatabase, type DbHandle } from '../db/client'
import type { ConfigStore } from '../config'

export interface VaultDeps {
  config: ConfigStore
  /** `app.getPath('documents')`. */
  documentsDir: string
  /** `SPRAWL_VAULT`: use this vault, skip onboarding, and don't remember it. */
  envVault: string | null
  /** Runs after a vault opens (the 30-day purge). A failure is logged, not fatal. */
  onOpen?: (handle: DbHandle) => void
}

interface OpenVault {
  path: string
  handle: DbHandle
}

/**
 * The open vault (ARCHITECTURE §3): one folder holding `sprawl.db`, attachments and backups.
 * Exactly one vault is open at a time, and only main touches it.
 */
export class VaultService {
  private current: OpenVault | null = null

  constructor(private readonly deps: VaultDeps) {}

  get defaultPath(): string {
    return join(this.deps.documentsDir, DEFAULT_VAULT_DIR)
  }

  info(): VaultInfo {
    return { path: this.current?.path ?? null, defaultPath: this.defaultPath }
  }

  /** The open database, or null before onboarding. */
  db(): DbHandle | null {
    return this.current?.handle ?? null
  }

  /**
   * Opens the vault to use at startup: `SPRAWL_VAULT`, else the remembered one. A remembered
   * folder that no longer exists (deleted, or an unplugged drive) goes back to onboarding
   * instead of silently creating an empty vault in its place.
   */
  restore(): VaultInfo {
    const { envVault, config } = this.deps
    if (envVault) return this.open(envVault, { remember: false })
    const remembered = config.get().vaultPath
    if (remembered && isDirectory(remembered)) {
      try {
        return this.open(remembered)
      } catch (err) {
        // later: phase-11 shows the "database locked or corrupt" recovery screen instead.
        console.error('[vault] could not open the remembered vault', err)
      }
    }
    return this.info()
  }

  /**
   * Opens the vault in `path`, creating the folder and `sprawl.db` if needed. On success the
   * previous vault is closed and the new path is remembered in config.json.
   */
  open(path: string, { remember = true }: { remember?: boolean } = {}): VaultInfo {
    mkdirSync(path, { recursive: true })
    const handle = openDatabase(join(path, VAULT_DB_FILE)) // throws before anything changes
    this.close()
    this.current = { path, handle }
    try {
      this.deps.onOpen?.(handle)
    } catch (err) {
      console.error('[vault] post-open housekeeping failed', err)
    }
    if (remember) this.deps.config.update((c) => void (c.vaultPath = path))
    return this.info()
  }

  close(): void {
    this.current?.handle.close()
    this.current = null
  }
}

function isDirectory(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory()
  } catch {
    return false
  }
}
