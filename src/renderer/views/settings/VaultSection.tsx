import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useVaultStore } from '@/stores/vaultStore'
import { SettingsRow, SettingsSection } from './SettingsLayout'

/**
 * Settings → Vault (UI_SPEC §9): the path, and "Change…", which opens a folder picker and then
 * asks before switching (UI_SPEC §11). The chosen folder's vault is opened, or created if the
 * folder has none. The current vault stays where it is.
 */
export function VaultSection() {
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
    <SettingsSection title="Vault" testId="settings-vault">
      <SettingsRow
        label="Vault folder"
        description={
          <span data-testid="settings-vault-path" className="font-mono break-all" title={path}>
            {path}
          </span>
        }
      >
        <Button
          variant="secondary"
          size="sm"
          data-testid="settings-vault-change"
          onClick={() => void choose()}
        >
          Change…
        </Button>
      </SettingsRow>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
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
