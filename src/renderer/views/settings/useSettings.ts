import { useCallback, useEffect, useState } from 'react'
import type { SettingKey, Settings } from '@shared/schemas'
import { useVaultStore } from '@/stores/vaultStore'

/**
 * All settings for the Settings view, read again when the vault changes. `update` shows the new
 * value at once and saves it; main follows the keys it acts on (reminders, tray, login item).
 */
export function useSettings(): {
  settings: Settings | null
  update<K extends SettingKey>(key: K, value: Settings[K]): void
  /** Shows a value main already saved (the capture shortcut goes through `system.setShortcut`). */
  local<K extends SettingKey>(key: K, value: Settings[K]): void
} {
  const vaultPath = useVaultStore((s) => s.info?.path)
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    let live = true
    void window.sprawl.settings.getAll().then((all) => live && setSettings(all))
    return () => {
      live = false
    }
  }, [vaultPath])

  const local = useCallback(<K extends SettingKey>(key: K, value: Settings[K]) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s))
  }, [])

  const update = useCallback(
    <K extends SettingKey>(key: K, value: Settings[K]) => {
      local(key, value)
      void window.sprawl.settings.set(key, value)
    },
    [local],
  )

  return { settings, update, local }
}
