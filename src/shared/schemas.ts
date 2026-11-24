import { z } from 'zod'
import { NOTE_COLORS } from './constants'

/**
 * zod schemas shared by main and renderer (ARCHITECTURE §9): the settings schema with its
 * defaults, and the input schema of every IPC method. Main parses every IPC input with these.
 */

// primitives -------------------------------------------------------------------------------

export const noteColorSchema = z.enum(NOTE_COLORS)

/** `HH:mm`, 24-hour. */
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm')

/** An absolute folder path: `C:\…`, `\\server\share\…` or `/…`. */
export const absolutePathSchema = z
  .string()
  .min(1)
  .max(1024)
  .refine((p) => /^[a-zA-Z]:[\\/]/.test(p) || /^\\\\[^\\]/.test(p) || p.startsWith('/'), {
    message: 'Expected an absolute path',
  })

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/** True for the only URL schemes Sprawl hands to the OS browser (ARCHITECTURE §2). */
export function isAllowedExternalUrl(value: string): boolean {
  try {
    return EXTERNAL_PROTOCOLS.has(new URL(value).protocol)
  } catch {
    return false
  }
}

export const externalUrlSchema = z
  .string()
  .max(4096)
  .refine(isAllowedExternalUrl, { message: 'Only http, https and mailto links can be opened' })

// settings ---------------------------------------------------------------------------------

export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1).max(4),
})

export const listFilterSchema = z.object({
  tab: z.enum(['open', 'due', 'done', 'all']),
  colors: z.array(noteColorSchema).max(NOTE_COLORS.length),
  sort: z.enum(['edited', 'created', 'title', 'due']),
})

export const morningSummarySchema = z.object({
  on: z.boolean(),
  // The Settings select offers 30-minute steps (UI_SPEC §9).
  time: timeOfDaySchema.refine((t) => t.endsWith(':00') || t.endsWith(':30'), {
    message: 'Expected a time on the hour or half hour',
  }),
})

/** Where a setting lives: the vault's `settings` table, or this PC's `config.json`. */
export type SettingStore = 'vault' | 'machine'

interface SettingDef<S extends z.ZodType> {
  store: SettingStore
  schema: S
  default: z.infer<S>
}

function def<S extends z.ZodType>(
  store: SettingStore,
  schema: S,
  value: z.infer<S>,
): SettingDef<S> {
  return { store, schema, default: value }
}

/**
 * Every setting, its store and its default (ARCHITECTURE §4). Machine settings belong to this
 * PC rather than the data, so switching vaults doesn't change them (PRODUCT §3.9).
 */
export const SETTINGS = {
  // vault
  viewport: def('vault', viewportSchema, { x: 0, y: 0, zoom: 1 }),
  showDone: def('vault', z.boolean(), false),
  snap: def('vault', z.boolean(), true),
  autoBackup: def('vault', z.boolean(), true),
  panelWidth: def('vault', z.number().int().min(320).max(720), 420),
  listFilter: def('vault', listFilterSchema, { tab: 'open', colors: [], sort: 'edited' }),
  remindersOn: def('vault', z.boolean(), true),
  morningSummary: def('vault', morningSummarySchema, { on: false, time: '09:00' }),
  notificationsPausedUntil: def('vault', z.number().int().nonnegative().nullable(), null),
  lastCaptureOffset: def('vault', z.number().int().min(0).max(100), 0),
  // machine
  captureShortcut: def('machine', z.string().min(1).max(64), 'Ctrl+Shift+Space'),
  captureDefaultMode: def('machine', z.enum(['note', 'log']), 'note'),
  keepInTray: def('machine', z.boolean(), true),
  openAtLogin: def('machine', z.boolean(), false),
}

export type SettingKey = keyof typeof SETTINGS
export type Settings = { [K in SettingKey]: z.infer<(typeof SETTINGS)[K]['schema']> }

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[]
export const settingKeySchema = z.enum(SETTING_KEYS as [SettingKey, ...SettingKey[]])

/** The default value of every setting. */
export function defaultSettings(): Settings {
  const out = {} as Record<SettingKey, unknown>
  for (const key of SETTING_KEYS) out[key] = structuredClone(SETTINGS[key].default)
  return out as Settings
}

/** Parses a stored value, falling back to the default when it's missing, stale or invalid. */
export function parseSetting<K extends SettingKey>(key: K, value: unknown): Settings[K] {
  const result = SETTINGS[key].schema.safeParse(value)
  return (result.success ? result.data : structuredClone(SETTINGS[key].default)) as Settings[K]
}

// IPC inputs -------------------------------------------------------------------------------

export const settingsGetInput = settingKeySchema

/** `{ key, value }`, with the value checked against that key's own schema. */
export const settingsSetInput = z
  .object({ key: settingKeySchema, value: z.unknown() })
  .transform((input, ctx) => {
    const result = SETTINGS[input.key].schema.safeParse(input.value)
    if (!result.success) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: z.prettifyError(result.error) })
      return z.NEVER
    }
    return { key: input.key, value: result.data }
  })

export const openVaultInput = absolutePathSchema
export const openExternalInput = externalUrlSchema
