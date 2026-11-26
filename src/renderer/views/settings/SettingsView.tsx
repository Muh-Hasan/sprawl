import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import markGradient from '@/assets/brand/sprawl-mark-gradient.svg'
import { TopBar } from '@/components/TopBar'
import { useCanvasStore } from '@/stores/canvasStore'
import { CaptureSection, SystemSection } from './CaptureSection'
import { NotificationsSection } from './NotificationsSection'
import { SettingsRow, SettingsSection } from './SettingsLayout'
import { useSettings } from './useSettings'
import { VaultSection } from './VaultSection'

const REPO_URL = 'https://github.com/Muh-Hasan/sprawl'

/** A disabled switch showing the stored value, until the setting's phase wires it up. */
function PlaceholderSwitch({ checked, label }: { checked: boolean | undefined; label: string }) {
  return <Switch checked={checked ?? false} disabled aria-label={label} />
}

/**
 * Settings (UI_SPEC §9). Vault, "Show done notes", Notifications, Quick capture and System are
 * live; the other rows show their stored values but stay disabled. later: phase-11 (backup,
 * export, snap), phase-12 (version in About).
 */
export function SettingsView() {
  const { settings, update, local } = useSettings()

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

          <NotificationsSection settings={settings} update={update} />
          <CaptureSection settings={settings} update={update} local={local} />
          <SystemSection settings={settings} update={update} />

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
