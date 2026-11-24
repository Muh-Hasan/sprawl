import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ConfigStore, parseConfig } from '../../../src/main/config'
import { useTempDirs } from '../helpers/tmp'

const tempDir = useTempDirs()

describe('parseConfig', () => {
  it('keeps valid fields and drops invalid ones independently', () => {
    const config = parseConfig({
      vaultPath: 'relative\\path', // not absolute
      window: { x: 10, y: 20, width: 1200, height: 800, maximized: true },
      settings: {
        keepInTray: false, // valid machine key
        openAtLogin: 'yes', // wrong type
        snap: false, // a vault key never lives in config.json
        nope: 1, // unknown key
      },
    })
    expect(config).toEqual({
      vaultPath: null,
      window: { x: 10, y: 20, width: 1200, height: 800, maximized: true },
      settings: { keepInTray: false },
    })
  })

  it('treats anything that is not an object as empty', () => {
    expect(parseConfig(null)).toEqual({ vaultPath: null, window: null, settings: {} })
    expect(parseConfig([1, 2])).toEqual({ vaultPath: null, window: null, settings: {} })
  })
})

describe('ConfigStore', () => {
  it('starts empty when the file is missing, and writes it on the first update', () => {
    const file = join(tempDir(), 'nested', 'config.json')
    const store = new ConfigStore(file)
    expect(store.get().vaultPath).toBeNull()
    expect(existsSync(file)).toBe(false)

    store.update((c) => void (c.vaultPath = 'C:\\Vault'))
    expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({ vaultPath: 'C:\\Vault' })
    expect(existsSync(`${file}.tmp`)).toBe(false)
    expect(new ConfigStore(file).get().vaultPath).toBe('C:\\Vault')
  })

  it('survives a corrupt file', () => {
    const file = join(tempDir(), 'config.json')
    writeFileSync(file, '{ not json')
    const store = new ConfigStore(file)
    expect(store.get()).toEqual({ vaultPath: null, window: null, settings: {} })
  })

  it("doesn't let callers mutate the stored config outside update()", () => {
    const store = new ConfigStore(join(tempDir(), 'config.json'))
    store.update((c) => void (c.settings.keepInTray = false))
    const snapshot = store.get()
    store.update((c) => void (c.settings.keepInTray = true))
    expect(snapshot.settings.keepInTray).toBe(false)
  })
})
