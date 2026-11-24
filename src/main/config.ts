import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import { absolutePathSchema, SETTINGS, type SettingKey } from '@shared/schemas'

/**
 * `config.json` in Electron's userData folder (ARCHITECTURE §3): what belongs to this PC rather
 * than to the data. The last vault path, the window state and the machine settings.
 *
 * Every field is parsed on its own, so a hand-edited or old file loses only its bad fields,
 * never the whole config. Writes are atomic (temp file + rename).
 */

export const windowStateSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  maximized: z.boolean(),
})
export type WindowState = z.infer<typeof windowStateSchema>

export interface MachineConfig {
  vaultPath: string | null
  window: WindowState | null
  /** Machine settings that differ from their defaults (validated by the settings service). */
  settings: Partial<Record<SettingKey, unknown>>
}

function emptyConfig(): MachineConfig {
  return { vaultPath: null, window: null, settings: {} }
}

/** Parses whatever is in the file, keeping each field only if it's valid. */
export function parseConfig(raw: unknown): MachineConfig {
  const config = emptyConfig()
  if (typeof raw !== 'object' || raw === null) return config
  const obj = raw as Record<string, unknown>

  const vault = absolutePathSchema.safeParse(obj['vaultPath'])
  if (vault.success) config.vaultPath = vault.data

  const win = windowStateSchema.safeParse(obj['window'])
  if (win.success) config.window = win.data

  const settings = obj['settings']
  if (typeof settings === 'object' && settings !== null) {
    for (const [key, value] of Object.entries(settings)) {
      const def = SETTINGS[key as SettingKey] as (typeof SETTINGS)[SettingKey] | undefined
      if (def?.store === 'machine' && def.schema.safeParse(value).success) {
        config.settings[key as SettingKey] = value
      }
    }
  }
  return config
}

export class ConfigStore {
  private data: MachineConfig

  constructor(readonly file: string) {
    this.data = ConfigStore.read(file)
  }

  private static read(file: string): MachineConfig {
    let text: string
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      return emptyConfig() // first run, or the user deleted it
    }
    try {
      return parseConfig(JSON.parse(text))
    } catch {
      console.warn(`[config] ${file} isn't valid JSON; starting from defaults`)
      return emptyConfig()
    }
  }

  get(): Readonly<MachineConfig> {
    return this.data
  }

  /** Applies a change and writes the file. */
  update(change: (config: MachineConfig) => void): void {
    const next = structuredClone(this.data)
    change(next)
    this.data = next
    this.write()
  }

  private write(): void {
    mkdirSync(dirname(this.file), { recursive: true })
    const json = `${JSON.stringify(this.data, null, 2)}\n`
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, json, 'utf8')
    try {
      renameSync(tmp, this.file)
    } catch {
      // Antivirus or the indexer can briefly lock the target on Windows; fall back to a plain write.
      writeFileSync(this.file, json, 'utf8')
    }
  }
}
