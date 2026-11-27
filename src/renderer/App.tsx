import { useEffect } from 'react'
import { Toaster } from '@/components/Toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { handleBeforeClose } from '@/lib/flushes'
import { matchesShortcut, TEXT_SIZE_SHORTCUTS } from '@/lib/shortcuts'
import { startClock } from '@/stores/clockStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useTextSizeStore } from '@/stores/textSizeStore'
import { useVaultStore } from '@/stores/vaultStore'
import { ChooseVault } from '@/views/onboarding/ChooseVault'
import { Shell } from './Shell'

/** The saved text size, and Ctrl+Shift+= / - / 0 to change it from anywhere (PRODUCT §4). */
function useTextSize(): void {
  useEffect(() => {
    const { load, step, set } = useTextSizeStore.getState()
    void load()
    const onKeyDown = (e: KeyboardEvent) => {
      if (matchesShortcut(e, TEXT_SIZE_SHORTCUTS.bigger)) step(1)
      else if (matchesShortcut(e, TEXT_SIZE_SHORTCUTS.smaller)) step(-1)
      else if (matchesShortcut(e, TEXT_SIZE_SHORTCUTS.reset)) set('default')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/** Onboarding until a vault is open, then the app frame. */
export function App() {
  const info = useVaultStore((s) => s.info)
  const load = useVaultStore((s) => s.load)
  const subscribe = useVaultStore((s) => s.subscribe)

  useEffect(() => {
    void load()
    // Read alongside the vault, so the shell rarely waits for it.
    void useSidebarStore.getState().load()
    return subscribe()
  }, [load, subscribe])
  useEffect(() => startClock(), [])
  useEffect(() => handleBeforeClose(), [])
  useTextSize()

  return (
    <TooltipProvider delayDuration={400}>
      <div data-testid="app-root" className="h-full bg-background">
        {info === null ? (
          // Blank for the few ms until main answers, so onboarding never flashes.
          <div className="h-11 [-webkit-app-region:drag]" />
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
