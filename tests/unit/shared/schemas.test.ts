import { describe, expect, it } from 'vitest'
import { IpcInputError, parseInput } from '../../../src/main/ipc/validate'
import {
  acceleratorSchema,
  canvasApplyInput,
  captureHeightInput,
  captureSubmitInput,
  notesListInput,
  notesPlaceInput,
  pauseNotificationsInput,
  setShortcutInput,
  canvasOpSchema,
  dayKeySchema,
  defaultSettings,
  linksAddInput,
  linksReorderInput,
  linksUpdateInput,
  logAddManualInput,
  logDayInput,
  logMonthInput,
  logUpdateInput,
  noteIdInput,
  notesCreateInput,
  notesSetDoneInput,
  notesUpdateInput,
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

describe('canvas op schemas', () => {
  const item = {
    id: 'c1',
    kind: 'note',
    refId: 'n1',
    url: null,
    title: null,
    x: 10.5,
    y: -20,
    w: 220,
    h: 96,
    z: 3,
  }
  const valid = (op: unknown) =>
    expect(canvasOpSchema.safeParse(op).success, JSON.stringify(op)).toBe(true)
  const invalid = (op: unknown) =>
    expect(canvasOpSchema.safeParse(op).success, JSON.stringify(op)).toBe(false)

  it('accepts well-formed create, update and delete ops', () => {
    valid({ op: 'create', item })
    valid({ op: 'create', item, note: { id: 'n1', title: 'Hi', color: 'sky' } })
    valid({
      op: 'create',
      item: { ...item, kind: 'link', refId: null, url: 'https://example.com', title: 'Ex' },
    })
    valid({ op: 'update', id: 'c1', patch: { x: 1, y: 2 } })
    valid({ op: 'update', id: 'c1', patch: { title: null } })
    valid({ op: 'delete', id: 'c1' })
  })

  it('rejects malformed ops', () => {
    invalid({ op: 'explode', id: 'c1' })
    invalid({ op: 'delete', id: '' })
    invalid({ op: 'delete', id: 'bad id/../' })
    invalid({ op: 'create', item: { ...item, kind: 'group' } })
    invalid({ op: 'create', item: { ...item, x: Number.POSITIVE_INFINITY } })
    invalid({ op: 'create', item: { ...item, w: 0 } })
    invalid({ op: 'create', item: { ...item, z: 1.5 } })
    invalid({ op: 'create', item: { ...item, extra: true } })
    invalid({ op: 'create', item: { ...item, refId: null } })
    invalid({ op: 'create', item: { ...item, kind: 'link', refId: null, url: null } })
    invalid({
      op: 'create',
      item: { ...item, kind: 'link', refId: null, url: 'file:///C:/x.exe' },
    })
    invalid({ op: 'create', item, note: { id: 'other', title: '', color: 'sky' } })
    invalid({ op: 'create', item, note: { id: 'n1', title: '', color: 'red' } })
    invalid({ op: 'update', id: 'c1', patch: {} })
    invalid({ op: 'update', id: 'c1', patch: { kind: 'link' } })
    invalid({ op: 'update', id: 'c1', patch: { x: Number.NaN } })
  })

  it('accepts restore and setColor, and pasted or copied notes', () => {
    valid({ op: 'restore', item })
    valid({ op: 'setColor', id: 'c1', color: 'lilac' })
    valid({ op: 'create', item, note: { id: 'n1', title: 'Hi', color: 'sky', body: 'a' } })
    valid({ op: 'create', item, note: { id: 'n1', title: 'Hi', color: 'sky', copyOf: 'n0' } })
    invalid({ op: 'restore', id: 'c1' })
    invalid({ op: 'restore', item: { ...item, refId: null } })
    invalid({ op: 'setColor', id: 'c1', color: 'teal' })
    invalid({ op: 'setColor', id: 'c1' })
    invalid({
      op: 'create',
      item,
      note: { id: 'n1', title: '', color: 'sky', body: 'a', copyOf: 'n0' },
    })
    invalid({ op: 'create', item, note: { id: 'n1', title: '', color: 'sky', copyOf: 'x y' } })
  })

  it('takes batches of 1 to 5,000 ops', () => {
    const del = { op: 'delete', id: 'c1' }
    expect(canvasApplyInput.safeParse([del]).success).toBe(true)
    expect(canvasApplyInput.safeParse([]).success).toBe(false)
    expect(canvasApplyInput.safeParse(Array(5001).fill(del)).success).toBe(false)
  })
})

describe('notes input schemas', () => {
  it('takes note ids, new notes and patches', () => {
    expect(noteIdInput.safeParse('n1').success).toBe(true)
    expect(noteIdInput.safeParse('../n1').success).toBe(false)
    expect(notesCreateInput.safeParse({ id: 'n1', title: 'A', color: 'sand' }).success).toBe(true)
    expect(
      notesCreateInput.safeParse({ id: 'n1', title: 'A', color: 'sand', extra: 1 }).success,
    ).toBe(false)
    expect(notesUpdateInput.safeParse({ id: 'n1', patch: { title: 'B' } }).success).toBe(true)
    expect(notesUpdateInput.safeParse({ id: 'n1', patch: { color: 'rose' } }).success).toBe(true)
    expect(notesUpdateInput.safeParse({ id: 'n1', patch: {} }).success).toBe(false)
    expect(notesUpdateInput.safeParse({ id: 'n1', patch: { doneAt: 5 } }).success).toBe(false)
    expect(notesUpdateInput.safeParse({ id: 'n1', patch: { color: 'teal' } }).success).toBe(false)
  })
})

describe('note patch: body and due fields', () => {
  const patch = (p: Record<string, unknown>) =>
    notesUpdateInput.safeParse({ id: 'n1', patch: p }).success

  it('takes a body that is a JSON array, and nothing else', () => {
    expect(patch({ bodyJson: '[]' })).toBe(true)
    expect(patch({ bodyJson: JSON.stringify([{ type: 'paragraph' }]) })).toBe(true)
    expect(patch({ bodyJson: '{}' })).toBe(false)
    expect(patch({ bodyJson: '[' })).toBe(false)
    expect(patch({ bodyJson: 5 })).toBe(false)
  })

  it('takes real days, HH:mm times, the remind options, and nulls to clear', () => {
    expect(patch({ dueDay: '2026-11-28', dueTime: '15:00', remind: '1h' })).toBe(true)
    expect(patch({ dueDay: null, dueTime: null, remind: 'none' })).toBe(true)
    expect(patch({ dueDay: '2026-02-30' })).toBe(false)
    expect(patch({ dueDay: '28/11/2026' })).toBe(false)
    expect(patch({ dueTime: '24:00' })).toBe(false)
    expect(patch({ dueTime: '9:00' })).toBe(false)
    expect(patch({ remind: '2h' })).toBe(false)
    expect(patch({ remindAt: 5 })).toBe(false)
  })

  it('checks day keys against the calendar, leap years included', () => {
    expect(dayKeySchema.safeParse('2028-02-29').success).toBe(true)
    expect(dayKeySchema.safeParse('2026-02-29').success).toBe(false)
    expect(dayKeySchema.safeParse('2026-13-01').success).toBe(false)
  })
})

describe('note link schemas', () => {
  it('adds only links Sprawl can open', () => {
    const add = (url: string) => linksAddInput.safeParse({ noteId: 'n1', url, label: null }).success
    expect(add('https://example.com')).toBe(true)
    expect(add('mailto:a@b.dev')).toBe(true)
    expect(add('javascript:alert(1)')).toBe(false)
    expect(add('file:///C:/x')).toBe(false)
  })

  it('updates a url or label, never with an empty patch', () => {
    expect(linksUpdateInput.safeParse({ id: 'k1', patch: { label: 'Docs' } }).success).toBe(true)
    expect(linksUpdateInput.safeParse({ id: 'k1', patch: { label: null } }).success).toBe(true)
    expect(linksUpdateInput.safeParse({ id: 'k1', patch: {} }).success).toBe(false)
    expect(linksUpdateInput.safeParse({ id: 'k1', patch: { url: 'ftp://x.dev' } }).success).toBe(
      false,
    )
  })

  it('reorders with distinct ids', () => {
    expect(linksReorderInput.safeParse({ noteId: 'n1', ids: ['a', 'b'] }).success).toBe(true)
    expect(linksReorderInput.safeParse({ noteId: 'n1', ids: ['a', 'a'] }).success).toBe(false)
  })
})

describe('done and daily log schemas', () => {
  it('takes a setDone op and notes.setDone input', () => {
    expect(canvasOpSchema.safeParse({ op: 'setDone', id: 'c1', done: true }).success).toBe(true)
    expect(canvasOpSchema.safeParse({ op: 'setDone', id: 'c1', done: 'yes' }).success).toBe(false)
    expect(canvasOpSchema.safeParse({ op: 'setDone', id: 'c1' }).success).toBe(false)
    expect(notesSetDoneInput.safeParse({ id: 'n1', done: false }).success).toBe(true)
    expect(notesSetDoneInput.safeParse({ id: 'n1', done: false, at: 1 }).success).toBe(false)
  })

  it('takes real days and months only', () => {
    expect(logDayInput.safeParse('2026-11-25').success).toBe(true)
    expect(logDayInput.safeParse('2026-02-30').success).toBe(false)
    expect(logMonthInput.safeParse('2026-11').success).toBe(true)
    expect(logMonthInput.safeParse('2026-13').success).toBe(false)
    expect(logMonthInput.safeParse('2026-1').success).toBe(false)
  })

  it('takes a manual entry with text, and an optional time', () => {
    const ok = { day: '2026-11-25', text: 'Called the bank' }
    expect(logAddManualInput.safeParse(ok).success).toBe(true)
    expect(logAddManualInput.safeParse({ ...ok, at: 1_764_000_000_000 }).success).toBe(true)
    expect(logAddManualInput.safeParse({ ...ok, text: '   ' }).success).toBe(false)
    expect(logAddManualInput.safeParse({ ...ok, at: -1 }).success).toBe(false)
    expect(logAddManualInput.safeParse({ ...ok, at: 1.5 }).success).toBe(false)
    expect(logAddManualInput.safeParse({ ...ok, kind: 'done' }).success).toBe(false)
  })

  it('takes an entry patch of text or an HH:mm time', () => {
    expect(logUpdateInput.safeParse({ id: 'e1', patch: { text: 'x' } }).success).toBe(true)
    expect(logUpdateInput.safeParse({ id: 'e1', patch: { time: '18:30' } }).success).toBe(true)
    expect(logUpdateInput.safeParse({ id: 'e1', patch: { time: '24:00' } }).success).toBe(false)
    expect(logUpdateInput.safeParse({ id: 'e1', patch: {} }).success).toBe(false)
    expect(logUpdateInput.safeParse({ id: 'e1', patch: { at: 5 } }).success).toBe(false)
  })
})

describe('phase 6 schemas: list, capture and system', () => {
  it('notes.list takes a tab, colors, a sort and a title filter', () => {
    const ok = { tab: 'due', colors: ['sage'], sort: 'title', text: 'rent' }
    expect(notesListInput.parse(ok)).toEqual(ok)
    for (const bad of [
      { ...ok, tab: 'later' },
      { ...ok, colors: ['red'] },
      { ...ok, sort: 'size' },
      { ...ok, text: 'x'.repeat(201) },
      { ...ok, extra: 1 },
      { tab: 'open', colors: [], sort: 'edited' },
    ]) {
      expect(notesListInput.safeParse(bad).success, JSON.stringify(bad)).toBe(false)
    }
  })

  it('placeOnCanvas takes an id and an optional world point', () => {
    expect(notesPlaceInput.parse({ id: 'n1' })).toEqual({ id: 'n1' })
    expect(notesPlaceInput.parse({ id: 'n1', at: { x: 1, y: -2 } }).at).toEqual({ x: 1, y: -2 })
    expect(notesPlaceInput.safeParse({ id: 'n1', at: { x: Infinity, y: 0 } }).success).toBe(false)
    expect(notesPlaceInput.safeParse({ id: '../x' }).success).toBe(false)
  })

  it('a capture is a mode and some text', () => {
    expect(captureSubmitInput.parse({ mode: 'log', text: 'Called' })).toEqual({
      mode: 'log',
      text: 'Called',
    })
    expect(captureSubmitInput.safeParse({ mode: 'note', text: ' \t\n ' }).success).toBe(false)
    expect(captureSubmitInput.safeParse({ mode: 'todo', text: 'x' }).success).toBe(false)
    expect(captureSubmitInput.safeParse({ mode: 'note', text: 'x'.repeat(10_001) }).success).toBe(
      false,
    )
    expect(captureHeightInput.safeParse(120.5).success).toBe(false)
    expect(captureHeightInput.safeParse(-1).success).toBe(false)
  })

  it('shortcuts are checked accelerators, and a pause is 0 to 1440 minutes', () => {
    expect(setShortcutInput.parse('Ctrl+Alt+N')).toBe('Ctrl+Alt+N')
    expect(setShortcutInput.safeParse('Shift+N').success).toBe(false)
    expect(acceleratorSchema.safeParse('Ctrl+Shift+Space').success).toBe(true)
    expect(pauseNotificationsInput.safeParse(60).success).toBe(true)
    expect(pauseNotificationsInput.safeParse(1441).success).toBe(false)
    expect(pauseNotificationsInput.safeParse(-5).success).toBe(false)
  })

  it('a bad stored shortcut falls back to the default', () => {
    expect(parseSetting('captureShortcut', 'Banana')).toBe('Ctrl+Shift+Space')
    expect(parseSetting('morningSummarySentOn', '2026-02-30')).toBeNull()
    expect(defaultSettings().morningSummarySentOn).toBeNull()
  })
})
