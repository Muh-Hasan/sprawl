import { useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
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
    </TooltipProvider>
  )
}
