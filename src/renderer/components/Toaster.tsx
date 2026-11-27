import { IconAlertTriangle } from '@tabler/icons-react'
import { Toaster as BaseToaster } from '@/components/ui/sonner'
import { ToastIcon } from './ToastIcon'

/** The canvas toolbar sits 20px up and is 58px tall; a toast clears it by 10px. */
const TOAST_BOTTOM = 88

/**
 * The app's toasts (UI_SPEC §11, DESIGN_SYSTEM §7): bottom center (88px up, clear of the canvas toolbar) for 4s, 380×48 on
 * `--popover` with a hairline border and a 12px radius, an 18px icon, 14px text and an optional
 * Undo. Dark only, so the theme is fixed rather than read from the OS. Sonner's own styles sit
 * on attribute selectors, so the sizes here need `!`.
 */
export function Toaster() {
  return (
    <BaseToaster
      theme="dark"
      position="bottom-center"
      duration={4000}
      // Above the canvas toolbar and the log composer, which sit at the bottom center too.
      offset={{ bottom: TOAST_BOTTOM }}
      icons={{ error: <ToastIcon icon={IconAlertTriangle} className="text-destructive" /> }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': '12px',
          '--width': '380px',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'min-h-12! gap-2.5! py-2! pr-2! pl-3.5! shadow-(--shadow-popover)!',
          title: 'text-sm! font-normal! leading-5!',
          icon: 'm-0! size-[18px]!',
        },
      }}
    />
  )
}
