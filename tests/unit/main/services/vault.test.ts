import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigStore } from '../../../../src/main/config'
import { VaultService } from '../../../../src/main/services/vault'
import { useTempDirs } from '../../helpers/tmp'

const tempDir = useTempDirs()
const services: VaultService[] = []
afterEach(() => {
  for (const s of services.splice(0)) s.close()
})

function setup(envVault: string | null = null) {
  const root = tempDir()
  const config = new ConfigStore(join(root, 'userData', 'config.json'))
  const vault = new VaultService({ config, documentsDir: join(root, 'Documents'), envVault })
  services.push(vault)
  return { root, config, vault }
}

describe('VaultService', () => {
  it('starts with no vault and suggests Documents\\Sprawl', () => {
    const { root, vault } = setup()
    expect(vault.restore()).toEqual({ path: null, defaultPath: join(root, 'Documents', 'Sprawl') })
    expect(vault.db()).toBeNull()
  })

  it('creates the folder and sprawl.db on open, and remembers the path', () => {
    const { root, config, vault } = setup()
    const path = join(root, 'My Vault')
    expect(vault.open(path).path).toBe(path)
    expect(existsSync(join(path, 'sprawl.db'))).toBe(true)
    expect(config.get().vaultPath).toBe(path)
    expect(vault.db()?.sqlite.pragma('journal_mode', { simple: true })).toBe('wal')
  })

  it('reopens the remembered vault on the next start', () => {
    const { root, config, vault } = setup()
    const path = join(root, 'Vault')
    vault.open(path)
    vault.close()

    const next = new VaultService({ config, documentsDir: root, envVault: null })
    services.push(next)
    expect(next.restore().path).toBe(path)
    expect(next.db()).not.toBeNull()
  })

  it('goes back to onboarding when the remembered folder is gone', () => {
    const { root, config, vault } = setup()
    const path = join(root, 'Vault')
    vault.open(path)
    vault.close()
    rmSync(path, { recursive: true, force: true })

    const next = new VaultService({ config, documentsDir: root, envVault: null })
    services.push(next)
    expect(next.restore().path).toBeNull()
    expect(existsSync(path)).toBe(false) // not silently recreated
  })

  it('uses SPRAWL_VAULT without remembering it', () => {
    const root = tempDir()
    const envVault = join(root, 'env-vault')
    const { config, vault } = setup(envVault)
    expect(vault.restore().path).toBe(envVault)
    expect(existsSync(join(envVault, 'sprawl.db'))).toBe(true)
    expect(config.get().vaultPath).toBeNull()
  })

  it('switches vaults, closing the previous database', () => {
    const { root, vault } = setup()
    vault.open(join(root, 'A'))
    const first = vault.db()!
    vault.open(join(root, 'B'))
    expect(first.sqlite.open).toBe(false)
    expect(vault.info().path).toBe(join(root, 'B'))
  })
})
