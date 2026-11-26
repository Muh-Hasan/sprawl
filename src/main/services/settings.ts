import { eq } from 'drizzle-orm'
import {
  defaultSettings,
  parseSetting,
  SETTING_KEYS,
  SETTINGS,
  type SettingKey,
  type Settings,
} from '@shared/schemas'
import type { ConfigStore } from '../config'
import type { DbHandle } from '../db/client'
import { settings as settingsTable } from '../db/schema'

export interface SettingsDeps {
  config: ConfigStore
  /** The open vault's database, or null before onboarding. */
  db: () => DbHandle | null
  /** Called after a setting is stored, so main can follow it (reminders, tray, login item). */
  onChange?: (key: SettingKey) => void
}

/**
 * One `get/set/getAll` API over two stores (ARCHITECTURE §4): vault keys live in the vault's
 * `settings` table, machine keys in config.json. Reads always go through the zod schema with
 * defaults, so a bad or old stored value never reaches the app.
 */
export class SettingsService {
  constructor(private readonly deps: SettingsDeps) {}

  get<K extends SettingKey>(key: K): Settings[K] {
    if (SETTINGS[key].store === 'machine') {
      return parseSetting(key, this.deps.config.get().settings[key])
    }
    const handle = this.deps.db()
    if (!handle) return parseSetting(key, undefined)
    const row = handle.db
      .select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .get()
    return parseSetting(key, row ? safeJson(row.value) : undefined)
  }

  getAll(): Settings {
    const all = defaultSettings() as Record<SettingKey, unknown>
    for (const key of SETTING_KEYS) all[key] = this.get(key)
    return all as Settings
  }

  /** Validates and stores a value. Throws on an invalid value, or a vault key with no vault open. */
  set<K extends SettingKey>(key: K, value: Settings[K]): void {
    const parsed = SETTINGS[key].schema.parse(value)
    if (SETTINGS[key].store === 'machine') {
      this.deps.config.update((c) => void (c.settings[key] = parsed))
      this.deps.onChange?.(key)
      return
    }
    const handle = this.deps.db()
    if (!handle) throw new Error(`Can't save "${key}": no vault is open`)
    const json = JSON.stringify(parsed)
    handle.db
      .insert(settingsTable)
      .values({ key, value: json })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: json } })
      .run()
    this.deps.onChange?.(key)
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
