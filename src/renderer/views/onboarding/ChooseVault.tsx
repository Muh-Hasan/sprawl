import { useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import markGradient from '@/assets/brand/sprawl-mark-gradient.svg'
import { useVaultStore } from '@/stores/vaultStore'
import { OnboardingBackdrop } from './OnboardingBackdrop'

/**
 * First launch (UI_SPEC §10): pick where the vault lives (Documents\Sprawl by default), then
 * Start creates it, and the canvas opens on its start screen (UI_SPEC §4.1a).
 */
export function ChooseVault({ defaultPath }: { defaultPath: string }) {
  const open = useVaultStore((s) => s.open)
  const [path, setPath] = useState(defaultPath)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathRef = useRef<HTMLInputElement>(null)

  // Long paths overflow the input; show the end (the folder name), not the drive. Again once
  // Geist Mono has loaded, since it's wider than the fallback.
  useLayoutEffect(() => {
    const toEnd = (): void => {
      const el = pathRef.current
      if (el) el.scrollLeft = el.scrollWidth
    }
    toEnd()
    void document.fonts.ready.then(toEnd)
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
    <div data-testid="onboarding" className="relative flex h-full flex-col bg-background">
      <OnboardingBackdrop />
      <div className="relative h-11 shrink-0 [-webkit-app-region:drag]" />
      <div className="relative flex flex-1 items-center justify-center pb-11">
        <section
          aria-label="Welcome"
          data-testid="onboarding-card"
          className="flex w-[440px] flex-col items-center rounded-[22px] border border-border bg-card/90 p-10 text-center shadow-(--shadow-palette) backdrop-blur-sm animate-in duration-500 fade-in-0 motion-safe:slide-in-from-bottom-3"
        >
          <img src={markGradient} alt="" aria-hidden className="size-14" draggable={false} />
          <h1
            data-testid="onboarding-title"
            className="mt-6 font-brand text-[30px] leading-[38px] tracking-[-0.02em]"
          >
            Welcome to sprawl
          </h1>
          <p className="mt-2.5 text-[16px] leading-6 text-muted-foreground">
            Notes, to-dos, sketches and a daily log. All on one canvas, all on your machine.
          </p>
          <div className="mt-7 w-full text-left">
            <label htmlFor="onboarding-path" className="mb-2 block text-xs font-medium">
              Keep your notes in
            </label>
            <div className="flex gap-2">
              <Input
                id="onboarding-path"
                ref={pathRef}
                readOnly
                value={path}
                title={path}
                data-testid="onboarding-path"
                className="h-[42px] min-w-0 flex-1 rounded-[10px] bg-background px-3 font-mono text-xs"
              />
              <Button
                variant="secondary"
                data-testid="onboarding-choose"
                className="h-[42px] rounded-[10px] border border-border px-3.5"
                onClick={() => void choose()}
              >
                Choose…
              </Button>
            </div>
            {error ? (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {error}
              </p>
            ) : (
              <p className="mt-2 text-xs text-subtle-foreground">
                A normal folder. Put it in OneDrive or Dropbox if you want it backed up.
              </p>
            )}
          </div>
          <Button
            className="mt-6 h-[46px] w-full rounded-xl text-[15px] font-semibold"
            data-testid="onboarding-start"
            disabled={busy}
            onClick={() => void start()}
          >
            Start
          </Button>
        </section>
      </div>
    </div>
  )
}
