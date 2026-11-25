import { useEffect } from 'react'
import { Toaster } from '@/components/Toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { handleBeforeClose } from '@/lib/flushes'
import { startClock } from '@/stores/clockStore'
import { useVaultStore } from '@/stores/vaultStore'
import { ChooseVault } from '@/views/onboarding/ChooseVault'
import { Shell } from './Shell'

/** Onboarding until a vault is open, then the app frame. */
export function App() {
  const info = useVaultStore((s) => s.info)
  const load = useVaultStore((s) => s.load)
  const subscribe = useVaultStore((s) => s.subscribe)

  useEffect(() => {
    void load()
    return subscribe()
  }, [load, subscribe])
  useEffect(() => startClock(), [])
  useEffect(() => handleBeforeClose(), [])

  return (
    <TooltipProvider delayDuration={400}>
      <div data-testid="app-root" className="h-full bg-background">
        {info === null ? (
          // Blank for the few ms until main answers, so onboarding never flashes.
          <div className="h-10 [-webkit-app-region:drag]" />
        ) : info.path === null ? (
          <ChooseVault defaultPath={info.defaultPath} />
        ) : (
          <Shell />
        )}
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
