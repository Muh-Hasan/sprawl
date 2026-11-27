import { z } from 'zod'
import { NOTE_COLORS, PANEL_WIDTH, REMIND_OPTIONS } from './constants'
import { isValidAccelerator } from './accelerator'
import { DEFAULT_TEXT_SIZE, TEXT_SIZES } from './textSize'
import { CANVAS_ITEM_KINDS, LIST_SORTS, LIST_TABS } from './types'

/**
 * zod schemas shared by main and renderer (ARCHITECTURE §9): the settings schema with its
 * defaults, and the input schema of every IPC method. Main parses every IPC input with these.
 */

// primitives -------------------------------------------------------------------------------

export const noteColorSchema = z.enum(NOTE_COLORS)

/** A local day key, `YYYY-MM-DD`, that names a real date. */
export const dayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine(
    (day) => {
      const [y, m, d] = day.split('-').map(Number) as [number, number, number]
      const date = new Date(Date.UTC(y, m - 1, d))
      return date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    },
    { message: 'Not a real date' },
  )

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

/** A global shortcut as an Electron accelerator, e.g. `Ctrl+Shift+Space`. */
export const acceleratorSchema = z
  .string()
  .max(64)
  .refine(isValidAccelerator, { message: 'Expected a shortcut like Ctrl+Shift+Space' })

// settings ---------------------------------------------------------------------------------

export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1).max(4),
})

export const listFilterSchema = z.object({
  tab: z.enum(LIST_TABS),
  colors: z.array(noteColorSchema).max(NOTE_COLORS.length),
  sort: z.enum(LIST_SORTS),
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
  panelWidth: def(
    'vault',
    z.number().int().min(PANEL_WIDTH.min).max(PANEL_WIDTH.max),
    PANEL_WIDTH.default,
  ),
  listFilter: def('vault', listFilterSchema, { tab: 'open', colors: [], sort: 'edited' }),
  remindersOn: def('vault', z.boolean(), true),
  morningSummary: def('vault', morningSummarySchema, { on: false, time: '09:00' }),
  notificationsPausedUntil: def('vault', z.number().int().nonnegative().nullable(), null),
  /** The day the morning summary was last sent, so it goes out once a day. */
  morningSummarySentOn: def('vault', dayKeySchema.nullable(), null),
  // machine
  captureShortcut: def('machine', acceleratorSchema, 'Ctrl+Shift+Space'),
  captureDefaultMode: def('machine', z.enum(['note', 'log']), 'note'),
  keepInTray: def('machine', z.boolean(), true),
  openAtLogin: def('machine', z.boolean(), false),
  textSize: def('machine', z.enum(TEXT_SIZES), DEFAULT_TEXT_SIZE),
  /** The sidebar is collapsed to its icon rail (Ctrl+\). */
  sidebarCollapsed: def('machine', z.boolean(), false),
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

// canvas -----------------------------------------------------------------------------------

/** A nanoid-style id: URL-safe characters only. */
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Expected an id')

/** World coordinates stay well inside float precision. */
const coordSchema = z.number().finite().min(-1e7).max(1e7)
const sizeSchema = z.number().finite().positive().max(1e5)
const zSchema = z.number().int().min(-1e9).max(1e9)
const labelSchema = z.string().max(1000)

export const canvasItemInputSchema = z
  .object({
    id: idSchema,
    kind: z.enum(CANVAS_ITEM_KINDS),
    refId: idSchema.nullable(),
    url: externalUrlSchema.nullable(),
    title: labelSchema.nullable(),
    x: coordSchema,
    y: coordSchema,
    w: sizeSchema,
    h: sizeSchema,
    z: zSchema,
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.kind === 'link') {
      if (item.url === null)
        ctx.addIssue({ code: 'custom', path: ['url'], message: 'A link card needs a url' })
      if (item.refId !== null)
        ctx.addIssue({ code: 'custom', path: ['refId'], message: 'A link card has no refId' })
    } else {
      if (item.refId === null)
        ctx.addIssue({
          code: 'custom',
          path: ['refId'],
          message: `A ${item.kind} card needs a refId`,
        })
      if (item.url !== null)
        ctx.addIssue({ code: 'custom', path: ['url'], message: 'Only link cards have a url' })
    }
  })

const noteTitleSchema = z.string().max(10_000)

export const newNoteSchema = z
  .object({
    id: idSchema,
    title: noteTitleSchema,
    color: noteColorSchema,
    body: z.string().max(1_000_000).optional(),
    copyOf: idSchema.optional(),
  })
  .strict()
  .refine((n) => n.body === undefined || n.copyOf === undefined, {
    message: 'A note is either pasted (body) or a copy (copyOf), not both',
  })

export const canvasItemPatchSchema = z
  .object({
    x: coordSchema,
    y: coordSchema,
    w: sizeSchema,
    h: sizeSchema,
    z: zSchema,
    url: externalUrlSchema,
    title: labelSchema.nullable(),
  })
  .strict()
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Empty patch' })

export const canvasOpSchema = z.discriminatedUnion('op', [
  z
    .object({
      op: z.literal('create'),
      item: canvasItemInputSchema,
      note: newNoteSchema.optional(),
    })
    .strict()
    .superRefine((op, ctx) => {
      if (op.note && (op.item.kind !== 'note' || op.item.refId !== op.note.id)) {
        ctx.addIssue({ code: 'custom', path: ['note'], message: "The note must be the card's ref" })
      }
    }),
  z.object({ op: z.literal('update'), id: idSchema, patch: canvasItemPatchSchema }).strict(),
  z.object({ op: z.literal('delete'), id: idSchema }).strict(),
  z.object({ op: z.literal('restore'), item: canvasItemInputSchema }).strict(),
  z.object({ op: z.literal('setColor'), id: idSchema, color: noteColorSchema }).strict(),
  z.object({ op: z.literal('setDone'), id: idSchema, done: z.boolean() }).strict(),
])

/** One `canvas.apply` batch. 5,000 ops covers a big paste or the dev seed with room to spare. */
export const canvasApplyInput = z.array(canvasOpSchema).min(1).max(5000)

// notes ------------------------------------------------------------------------------------

/** The largest note body main accepts (BlockNote JSON). Images live in attachments, not here. */
export const MAX_BODY_JSON = 5_000_000

/** A BlockNote document: JSON for an array (of blocks). */
export const bodyJsonSchema = z
  .string()
  .max(MAX_BODY_JSON)
  .refine(
    (json) => {
      try {
        return Array.isArray(JSON.parse(json))
      } catch {
        return false
      }
    },
    { message: 'Expected a JSON array of blocks' },
  )

export const remindSchema = z.enum(REMIND_OPTIONS)

export const notePatchSchema = z
  .object({
    title: noteTitleSchema,
    color: noteColorSchema,
    bodyJson: bodyJsonSchema,
    dueDay: dayKeySchema.nullable(),
    dueTime: timeOfDaySchema.nullable(),
    remind: remindSchema,
  })
  .strict()
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Empty patch' })

export const noteIdInput = idSchema
export const notesCreateInput = newNoteSchema
export const notesUpdateInput = z.object({ id: idSchema, patch: notePatchSchema }).strict()
export const notesSetDoneInput = z.object({ id: idSchema, done: z.boolean() }).strict()
export const notesSetPinnedInput = z.object({ id: idSchema, pinned: z.boolean() }).strict()

// note links -------------------------------------------------------------------------------

export const linkLabelSchema = z.string().max(1000)

export const linksAddInput = z
  .object({ noteId: idSchema, url: externalUrlSchema, label: linkLabelSchema.nullable() })
  .strict()

export const linksUpdateInput = z
  .object({
    id: idSchema,
    patch: z
      .object({ url: externalUrlSchema, label: linkLabelSchema.nullable() })
      .strict()
      .partial()
      .refine((patch) => Object.keys(patch).length > 0, { message: 'Empty patch' }),
  })
  .strict()

export const linksReorderInput = z
  .object({ noteId: idSchema, ids: z.array(idSchema).max(1000) })
  .strict()
  .refine(({ ids }) => new Set(ids).size === ids.length, { message: 'Duplicate ids' })

// daily log --------------------------------------------------------------------------------

/** A month, `YYYY-MM`. */
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM')

/** A manual entry's text: one line of inline markdown, never blank. */
export const logTextSchema = z
  .string()
  .max(10_000)
  .refine((t) => t.trim().length > 0, { message: 'An entry needs some text' })

/** An instant (ms UTC) within reason. */
const instantSchema = z.number().int().min(0).max(8.64e15)

export const logDayInput = dayKeySchema
export const logMonthInput = monthSchema
export const logAddManualInput = z
  .object({ day: dayKeySchema, text: logTextSchema, at: instantSchema.optional() })
  .strict()
export const logUpdateInput = z
  .object({
    id: idSchema,
    patch: z
      .object({ text: logTextSchema, time: timeOfDaySchema })
      .strict()
      .partial()
      .refine((patch) => Object.keys(patch).length > 0, { message: 'Empty patch' }),
  })
  .strict()

// list view --------------------------------------------------------------------------------

export const notesListInput = listFilterSchema.extend({ text: z.string().max(200) }).strict()

/** `listCounts`: the colors and title filter, without a tab or sort. */
export const notesCountsInput = notesListInput.pick({ colors: true, text: true }).strict()

/** `placeOnCanvas`: the note, and the world point to center its card on (default: the view center). */
export const notesPlaceInput = z
  .object({ id: idSchema, at: z.object({ x: coordSchema, y: coordSchema }).strict().optional() })
  .strict()

// quick capture and system -----------------------------------------------------------------

export const captureModeSchema = z.enum(['note', 'log'])

/** One capture: at most 10,000 characters, never blank. */
export const captureSubmitInput = z
  .object({
    mode: captureModeSchema,
    text: z
      .string()
      .max(10_000)
      .refine((t) => t.trim().length > 0, { message: 'Nothing to capture' }),
  })
  .strict()

/** The capture card's height in px; main clamps it to 112–320. */
export const captureHeightInput = z.number().int().min(0).max(2000)

export const setShortcutInput = acceleratorSchema

/** Pause for this many minutes (0 resumes). At most a day. */
export const pauseNotificationsInput = z
  .number()
  .int()
  .min(0)
  .max(24 * 60)

export const shortcutPausedInput = z.boolean()
