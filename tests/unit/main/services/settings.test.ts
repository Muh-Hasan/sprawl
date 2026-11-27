import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigStore } from '../../../../src/main/config'
import { openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { SettingsService } from '../../../../src/main/services/settings'
import { defaultSettings, type Settings } from '../../../../src/shared/schemas'
import { useTempDirs } from '../../helpers/tmp'

const tempDir = useTempDirs()
let handle: DbHandle | null = null
afterEach(() => {
  handle?.close()
  handle = null
})

function setup(withVault = true): { service: SettingsService; config: ConfigStore; file: string } {
  const file = join(tempDir(), 'config.json')
  const config = new ConfigStore(file)
  handle = withVault ? openDatabase(':memory:') : null
  const db = handle
  return { service: new SettingsService({ config, db: () => db }), config, file }
}

function vaultRows(): Record<string, unknown> {
  const rows = handle!.sqlite.prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]))
}

describe('SettingsService', () => {
  it('returns the defaults when nothing is stored', () => {
    const { service } = setup()
    expect(service.getAll()).toEqual(defaultSettings())
    expect(service.get('panelWidth')).toBe(440)
    expect(service.get('captureShortcut')).toBe('Ctrl+Shift+Space')
  })

  it('returns the defaults before a vault is open', () => {
    const { service } = setup(false)
    expect(service.get('viewport')).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('stores vault keys in the settings table, not config.json', () => {
    const { service, config } = setup()
    service.set('snap', false)
    service.set('viewport', { x: 12, y: -4, zoom: 2 })
    expect(vaultRows()).toEqual({ snap: false, viewport: { x: 12, y: -4, zoom: 2 } })
    expect(config.get().settings).toEqual({})
    expect(service.get('viewport')).toEqual({ x: 12, y: -4, zoom: 2 })
  })

  it('stores machine keys in config.json, not the vault', () => {
    const { service, file } = setup()
    service.set('keepInTray', false)
    service.set('captureDefaultMode', 'log')
    expect(vaultRows()).toEqual({})
    expect(JSON.parse(readFileSync(file, 'utf8')).settings).toEqual({
      keepInTray: false,
      captureDefaultMode: 'log',
    })
    expect(service.get('captureDefaultMode')).toBe('log')
  })

  it('overwrites an existing value', () => {
    const { service } = setup()
    service.set('panelWidth', 500)
    service.set('panelWidth', 600)
    expect(service.get('panelWidth')).toBe(600)
  })

  it('rejects invalid values and leaves the stored value alone', () => {
    const { service } = setup()
    service.set('panelWidth', 500)
    expect(() => service.set('panelWidth', 9000)).toThrow()
    expect(() => service.set('showDone', 'yes' as unknown as boolean)).toThrow()
    expect(() =>
      service.set('listFilter', {
        tab: 'later',
        colors: [],
        sort: 'edited',
      } as unknown as Settings['listFilter']),
    ).toThrow()
    expect(service.get('panelWidth')).toBe(500)
  })

  it('refuses to save a vault key with no vault open', () => {
    const { service } = setup(false)
    expect(() => service.set('snap', false)).toThrow(/no vault is open/)
    // Machine keys still work before onboarding.
    service.set('openAtLogin', true)
    expect(service.get('openAtLogin')).toBe(true)
  })

  it('falls back to the default for a corrupt or stale stored value', () => {
    const { service } = setup()
    const insert = handle!.sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
    insert.run('panelWidth', '"wide"')
    insert.run('viewport', '{not json')
    expect(service.get('panelWidth')).toBe(440)
    expect(service.get('viewport')).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('never hands out the shared default object', () => {
    const { service } = setup()
    const filter = service.get('listFilter')
    filter.colors.push('rose')
    expect(service.get('listFilter').colors).toEqual([])
  })
})
