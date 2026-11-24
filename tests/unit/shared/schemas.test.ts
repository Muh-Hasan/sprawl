import { describe, expect, it } from 'vitest'
import { IpcInputError, parseInput } from '../../../src/main/ipc/validate'
import {
  defaultSettings,
  isAllowedExternalUrl,
  openExternalInput,
  openVaultInput,
  parseSetting,
  SETTING_KEYS,
  SETTINGS,
  settingsGetInput,
  settingsSetInput,
} from '../../../src/shared/schemas'

describe('settings schema', () => {
  it('has a default for every key that passes its own schema', () => {
    for (const key of SETTING_KEYS) {
      expect(SETTINGS[key].schema.safeParse(SETTINGS[key].default).success, key).toBe(true)
    }
  })

  it('puts each key in the store ARCHITECTURE §4 assigns it', () => {
    const machine = SETTING_KEYS.filter((k) => SETTINGS[k].store === 'machine').sort()
    expect(machine).toEqual(['captureDefaultMode', 'captureShortcut', 'keepInTray', 'openAtLogin'])
  })

  it('parseSetting falls back to the default for bad values', () => {
    expect(parseSetting('panelWidth', 500)).toBe(500)
    expect(parseSetting('panelWidth', 100)).toBe(420)
    expect(parseSetting('viewport', { x: 0, y: 0, zoom: 99 })).toEqual(defaultSettings().viewport)
    expect(parseSetting('showDone', undefined)).toBe(false)
  })
})

describe('IPC input schemas', () => {
  const ok = (schema: { safeParse(v: unknown): { success: boolean } }, v: unknown) =>
    expect(schema.safeParse(v).success, JSON.stringify(v)).toBe(true)
  const bad = (schema: { safeParse(v: unknown): { success: boolean } }, v: unknown) =>
    expect(schema.safeParse(v).success, JSON.stringify(v)).toBe(false)

  it('settings.get takes a known key', () => {
    ok(settingsGetInput, 'viewport')
    bad(settingsGetInput, 'nope')
    bad(settingsGetInput, 42)
  })

  it('settings.set checks the value against that key', () => {
    ok(settingsSetInput, { key: 'snap', value: false })
    ok(settingsSetInput, { key: 'viewport', value: { x: -100.5, y: 40, zoom: 0.1 } })
    ok(settingsSetInput, {
      key: 'listFilter',
      value: { tab: 'due', colors: ['sky'], sort: 'title' },
    })
    ok(settingsSetInput, { key: 'morningSummary', value: { on: true, time: '07:30' } })
    ok(settingsSetInput, { key: 'notificationsPausedUntil', value: null })

    bad(settingsSetInput, { key: 'snap', value: 'false' })
    bad(settingsSetInput, { key: 'viewport', value: { x: 0, y: 0, zoom: 5 } })
    bad(settingsSetInput, { key: 'viewport', value: { x: Infinity, y: 0, zoom: 1 } })
    bad(settingsSetInput, {
      key: 'listFilter',
      value: { tab: 'due', colors: ['red'], sort: 'title' },
    })
    bad(settingsSetInput, { key: 'morningSummary', value: { on: true, time: '07:15' } })
    bad(settingsSetInput, { key: 'morningSummary', value: { on: true, time: '25:00' } })
    bad(settingsSetInput, { key: 'panelWidth', value: 319 })
    bad(settingsSetInput, { key: 'captureDefaultMode', value: 'draw' })
    bad(settingsSetInput, { key: 'nope', value: 1 })
    bad(settingsSetInput, { value: 1 })
  })

  it('app.openVault takes an absolute path', () => {
    ok(openVaultInput, 'C:\\Users\\me\\Documents\\Sprawl')
    ok(openVaultInput, 'D:/Notes')
    ok(openVaultInput, '\\\\server\\share\\Sprawl')
    bad(openVaultInput, 'Documents\\Sprawl')
    bad(openVaultInput, '')
    bad(openVaultInput, 'C:')
    bad(openVaultInput, 42)
  })

  it('app.openExternal allows only http, https and mailto', () => {
    ok(openExternalInput, 'https://github.com/Muh-Hasan/sprawl')
    ok(openExternalInput, 'http://localhost:3000')
    ok(openExternalInput, 'mailto:hi@example.com')
    bad(openExternalInput, 'file:///C:/Windows/System32/calc.exe')
    bad(openExternalInput, 'javascript:alert(1)')
    bad(openExternalInput, 'ms-settings:notifications')
    bad(openExternalInput, 'not a url')
    expect(isAllowedExternalUrl('HTTPS://EXAMPLE.COM')).toBe(true)
  })

  it('parseInput throws a typed error naming the channel', () => {
    expect(() => parseInput('settings:get', settingsGetInput, 'nope')).toThrow(IpcInputError)
    expect(() => parseInput('settings:get', settingsGetInput, 'nope')).toThrow(
      /\[invalid-input\] settings:get/,
    )
    expect(parseInput('settings:set', settingsSetInput, { key: 'snap', value: true })).toEqual({
      key: 'snap',
      value: true,
    })
  })
})
