import type { SettingKey, Settings } from '@shared/schemas'
import { SegmentedControl } from '@/components/SegmentedControl'
import { ShortcutRecorder } from '@/components/ShortcutRecorder'
import { Switch } from '@/components/ui/switch'
import { SettingsRow, SettingsSection } from './SettingsLayout'

interface SectionProps {
  settings: Settings | null
  update<K extends SettingKey>(key: K, value: Settings[K]): void
  local<K extends SettingKey>(key: K, value: Settings[K]): void
}

const MODES = [
  { value: 'note', label: 'Note' },
  { value: 'log', label: 'Log' },
] as const

/** Quick capture (UI_SPEC §9): the global shortcut and the mode the window opens in. */
export function CaptureSection({ settings, update, local }: SectionProps) {
  return (
    <SettingsSection title="Quick capture" testId="settings-capture">
      <SettingsRow label="Shortcut" description="Opens quick capture from any app.">
        {settings && (
          <ShortcutRecorder
            testId="settings-shortcut"
            value={settings.captureShortcut}
            onRecordingChange={(on) => void window.sprawl.system.pauseShortcut(on)}
            onRecord={async (accel) => {
              const result = await window.sprawl.system.setShortcut(accel)
              if (result.ok) local('captureShortcut', accel)
              return result
            }}
          />
        )}
      </SettingsRow>
      <SettingsRow label="Default mode">
        <SegmentedControl
          label="Default mode"
          value={settings?.captureDefaultMode ?? 'note'}
          options={MODES}
          onChange={(mode) => update('captureDefaultMode', mode)}
          testIdPrefix="settings-capture-mode"
        />
      </SettingsRow>
    </SettingsSection>
  )
}

/** System (UI_SPEC §9): keep running in the tray, and start with Windows. */
export function SystemSection({ settings, update }: Omit<SectionProps, 'local'>) {
  return (
    <SettingsSection title="System" testId="settings-system">
      <SettingsRow
        label="Keep Sprawl running in the background"
        description="Needed for reminders and quick capture. Closing the window hides Sprawl to the tray."
      >
        <Switch
          data-testid="settings-keep-in-tray"
          aria-label="Keep Sprawl running in the background"
          checked={settings?.keepInTray ?? false}
          disabled={!settings}
          onCheckedChange={(on) => update('keepInTray', on)}
        />
      </SettingsRow>
      <SettingsRow
        label="Start Sprawl when Windows starts"
        description="Starts hidden in the tray."
      >
        <Switch
          data-testid="settings-open-at-login"
          aria-label="Start Sprawl when Windows starts"
          checked={settings?.openAtLogin ?? false}
          disabled={!settings}
          onCheckedChange={(on) => update('openAtLogin', on)}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
