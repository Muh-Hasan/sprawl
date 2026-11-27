import { SegmentedControl } from '@/components/SegmentedControl'
import { ShortcutRecorder } from '@/components/ShortcutRecorder'
import { SettingsRow, SettingsSection } from './SettingsLayout'
import type { SectionProps } from './useSettings'

const MODES = [
  { value: 'note', label: 'Note' },
  { value: 'log', label: 'Log' },
] as const

/** Quick capture (UI_SPEC §9): the global shortcut and the mode the window opens in. */
export function CaptureSection({ settings, update, local }: SectionProps) {
  return (
    <SettingsSection
      title="Quick capture"
      blurb="Jot something down from any app."
      testId="settings-capture"
    >
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
      <SettingsRow label="Default mode" description="What the window opens in.">
        <SegmentedControl
          label="Default mode"
          size="md"
          value={settings?.captureDefaultMode ?? 'note'}
          options={MODES}
          onChange={(mode) => update('captureDefaultMode', mode)}
          testIdPrefix="settings-capture-mode"
        />
      </SettingsRow>
    </SettingsSection>
  )
}
