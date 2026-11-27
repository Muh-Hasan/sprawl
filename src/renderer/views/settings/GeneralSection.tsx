import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useVaultStore } from '@/stores/vaultStore'
import { SettingsRow, SettingsSection } from './SettingsLayout'
import type { SectionProps } from './useSettings'

/**
 * Settings → General (UI_SPEC §9): the vault folder, running in the tray, and starting with
 * Windows. "Change…" opens a folder picker and then asks before switching (UI_SPEC §11). The
 * chosen folder's vault is opened, or created if the folder has none. The current vault stays
 * where it is.
 */
export function GeneralSection({ settings, update }: SectionProps) {
  const path = useVaultStore((s) => s.info?.path ?? '')
  const open = useVaultStore((s) => s.open)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const choose = async () => {
    setError(null)
    const picked = await window.sprawl.app.pickVaultFolder()
    if (picked && picked !== path) setPending(picked)
  }

  const confirm = async () => {
    if (!pending) return
    try {
      await open(pending)
    } catch {
      setError(`Couldn't open a vault in ${pending}.`)
    } finally {
      setPending(null)
    }
  }

  return (
    <SettingsSection
      title="General"
      blurb="Where your notes live and how Sprawl runs."
      testId="settings-general"
    >
      <SettingsRow
        label="Vault folder"
        description={
          <>
            <span
              data-testid="settings-vault-path"
              className="mt-0.5 block font-mono text-2xs font-normal break-all"
              title={path}
            >
              {path}
            </span>
            {error && (
              <span role="alert" className="mt-1 block text-destructive">
                {error}
              </span>
            )}
          </>
        }
      >
        <Button
          variant="secondary"
          data-testid="settings-vault-change"
          onClick={() => void choose()}
        >
          Change…
        </Button>
      </SettingsRow>
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
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(isOpen) => !isOpen && setPending(null)}
        testId="vault-change-dialog"
        title="Switch vault?"
        description={
          <>
            Sprawl will open the vault in <span className="font-mono break-all">{pending}</span>. If
            there's no vault there yet, an empty one is created. Your current vault stays where it
            is.
          </>
        }
        confirmLabel="Switch vault"
        onConfirm={() => void confirm()}
      />
    </SettingsSection>
  )
}
