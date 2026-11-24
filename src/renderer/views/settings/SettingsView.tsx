import { useEffect, useState } from 'react'
import type { Settings } from '@shared/schemas'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import markGradient from '@/assets/brand/sprawl-mark-gradient.svg'
import { ShortcutKbd } from '@/components/ShortcutKbd'
import { TopBar } from '@/components/TopBar'
import { useVaultStore } from '@/stores/vaultStore'
import { SettingsRow, SettingsSection } from './SettingsLayout'
import { VaultSection } from './VaultSection'

const REPO_URL = 'https://github.com/Muh-Hasan/sprawl'

/** A disabled switch showing the stored value, until the setting's phase wires it up. */
function PlaceholderSwitch({ checked, label }: { checked: boolean | undefined; label: string }) {
  return <Switch checked={checked ?? false} disabled aria-label={label} />
}

/**
 * Settings (UI_SPEC §9). Phase 1 wires the Vault section; the other rows show their stored
 * values but stay disabled. later: phase-5 (show done), phase-6 (notifications, quick capture,
 * system), phase-11 (backup, export, snap), phase-12 (version in About).
 */
export function SettingsView() {
  const vaultPath = useVaultStore((s) => s.info?.path)
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    let live = true
    void window.sprawl.settings.getAll().then((all) => live && setSettings(all))
    return () => {
      live = false
    }
  }, [vaultPath])

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar left="Settings" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          data-testid="view-settings-content"
          className="mx-auto flex max-w-[640px] flex-col gap-8 px-6 py-8"
        >
          <VaultSection />

          <SettingsSection title="Canvas">
            <SettingsRow label="Snap to grid">
              <PlaceholderSwitch label="Snap to grid" checked={settings?.snap} />
            </SettingsRow>
            <SettingsRow label="Show done notes">
              <PlaceholderSwitch label="Show done notes" checked={settings?.showDone} />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Notifications">
            <SettingsRow label="Due reminders">
              <PlaceholderSwitch label="Due reminders" checked={settings?.remindersOn} />
            </SettingsRow>
            <SettingsRow label="Morning summary">
              <PlaceholderSwitch label="Morning summary" checked={settings?.morningSummary.on} />
            </SettingsRow>
            <SettingsRow label="Test notification">
              <Button variant="secondary" size="sm" disabled>
                Send a test notification
              </Button>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Quick capture">
            <SettingsRow label="Shortcut">
              {settings?.captureShortcut.split('+').map((key) => (
                <ShortcutKbd key={key}>{key}</ShortcutKbd>
              ))}
            </SettingsRow>
            <SettingsRow label="Default mode">
              <span className="text-sm text-muted-foreground capitalize">
                {settings?.captureDefaultMode}
              </span>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="System">
            <SettingsRow
              label="Keep Sprawl running in the background"
              description="Needed for reminders and quick capture. Closing the window hides Sprawl to the tray."
            >
              <PlaceholderSwitch
                label="Keep Sprawl running in the background"
                checked={settings?.keepInTray}
              />
            </SettingsRow>
            <SettingsRow label="Start Sprawl when Windows starts">
              <PlaceholderSwitch
                label="Start Sprawl when Windows starts"
                checked={settings?.openAtLogin}
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Backup">
            <SettingsRow label="Daily backup">
              <PlaceholderSwitch label="Daily backup" checked={settings?.autoBackup} />
            </SettingsRow>
            <SettingsRow label="Back up now">
              <Button variant="secondary" size="sm" disabled>
                Back up now
              </Button>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Export">
            <SettingsRow label="Markdown">
              <Button variant="secondary" size="sm" disabled>
                Export as markdown…
              </Button>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="About">
            <div className="flex items-center gap-3 py-2">
              <img src={markGradient} alt="" aria-hidden className="size-8" draggable={false} />
              <div className="flex flex-col">
                <span
                  data-testid="settings-about-name"
                  className="font-brand text-sm font-semibold"
                >
                  sprawl
                </span>
                <span className="text-xs text-muted-foreground">
                  MIT license ·{' '}
                  <button
                    type="button"
                    data-testid="settings-about-github"
                    className="underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => void window.sprawl.app.openExternal(REPO_URL)}
                  >
                    GitHub
                  </button>
                </span>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}
