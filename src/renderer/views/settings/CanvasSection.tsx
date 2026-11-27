import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useCanvasStore } from '@/stores/canvasStore'
import { SettingsRow, SettingsSection } from './SettingsLayout'
import type { SectionProps } from './useSettings'

/**
 * Settings → Canvas (UI_SPEC §9). "Show done notes" is live; snap to grid shows its stored value
 * but stays disabled. later: phase-11 (snap).
 */
export function CanvasSection({ settings, local }: SectionProps) {
  return (
    <SettingsSection title="Canvas" blurb="How the board behaves." testId="settings-canvas">
      <SettingsRow
        label="Snap to grid"
        description="Cards line up on the 8px grid as you drag them."
        soon
      >
        <Switch
          data-testid="settings-snap"
          aria-label="Snap to grid"
          checked={settings?.snap ?? false}
          disabled
        />
      </SettingsRow>
      <SettingsRow
        label="Show done notes"
        description="Done notes stay on the board, faded and struck through."
      >
        {/* The same setting as the canvas top bar's toggle (PRODUCT §3.1). */}
        <Switch
          data-testid="settings-show-done"
          aria-label="Show done notes"
          checked={settings?.showDone ?? false}
          disabled={!settings}
          onCheckedChange={(showDone) => {
            local('showDone', showDone)
            useCanvasStore.getState().setShowDone(showDone)
          }}
        />
      </SettingsRow>
    </SettingsSection>
  )
}

/**
 * Settings → Backup and export (UI_SPEC §9). Every row shows "Coming soon" and stays disabled.
 * later: phase-11 (backup, export).
 */
export function BackupSection({ settings }: SectionProps) {
  return (
    <SettingsSection
      title="Backup and export"
      blurb="Your data stays yours, in plain files."
      testId="settings-backup"
    >
      <SettingsRow
        label="Daily backup"
        description="Keeps the last 7 as zip files in your vault."
        soon
      >
        <Switch
          data-testid="settings-auto-backup"
          aria-label="Daily backup"
          checked={settings?.autoBackup ?? false}
          disabled
        />
      </SettingsRow>
      <SettingsRow label="Back up now" description="Saves a zip of everything right away." soon>
        <Button variant="secondary" data-testid="settings-backup-now" disabled>
          Back up now
        </Button>
      </SettingsRow>
      <SettingsRow
        label="Export as markdown"
        description="A folder of .md notes, .excalidraw drawings and your attachments."
        soon
      >
        <Button variant="secondary" data-testid="settings-export" disabled>
          Export…
        </Button>
      </SettingsRow>
    </SettingsSection>
  )
}
