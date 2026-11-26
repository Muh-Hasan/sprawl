import { useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import markGradient from '@/assets/brand/sprawl-mark-gradient.svg'
import { useVaultStore } from '@/stores/vaultStore'

/**
 * First launch (UI_SPEC §10): pick where the vault lives (Documents\Sprawl by default), then
 * Start creates it. later: phase-12 adds the "Start here" welcome note.
 */
export function ChooseVault({ defaultPath }: { defaultPath: string }) {
  const open = useVaultStore((s) => s.open)
  const [path, setPath] = useState(defaultPath)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathRef = useRef<HTMLInputElement>(null)

  // Long paths overflow the input; show the end (the folder name), not the drive.
  useLayoutEffect(() => {
    const el = pathRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [path])

  const choose = async () => {
    const picked = await window.sprawl.app.pickVaultFolder()
    if (picked) {
      setPath(picked)
      setError(null)
    }
  }

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      await open(path)
    } catch {
      setError("Couldn't create a vault there. Choose another folder.")
      setBusy(false)
    }
  }

  return (
    <div data-testid="onboarding" className="flex h-full flex-col bg-background">
      <div className="h-11 shrink-0 [-webkit-app-region:drag]" />
      <div className="flex flex-1 items-center justify-center pb-10">
        <div className="flex w-[360px] flex-col items-center text-center">
          <img src={markGradient} alt="" aria-hidden className="size-12" draggable={false} />
          <h1 data-testid="onboarding-title" className="mt-6 font-brand text-title">
            Welcome to sprawl
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Notes, to-dos, sketches and a daily log. All on one canvas, all on your machine.
          </p>
          <div className="mt-8 flex w-full gap-2">
            <Input
              ref={pathRef}
              readOnly
              value={path}
              title={path}
              aria-label="Vault folder"
              data-testid="onboarding-path"
              className="h-8 min-w-0 flex-1 font-mono text-xs"
            />
            <Button
              variant="secondary"
              size="sm"
              data-testid="onboarding-choose"
              onClick={() => void choose()}
            >
              Choose…
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-2 w-full text-left text-xs text-destructive">
              {error}
            </p>
          )}
          <Button
            className="mt-4 h-9 w-full"
            data-testid="onboarding-start"
            disabled={busy}
            onClick={() => void start()}
          >
            Start
          </Button>
        </div>
      </div>
    </div>
  )
}
