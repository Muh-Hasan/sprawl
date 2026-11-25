import { Toaster as BaseToaster } from '@/components/ui/sonner'

/**
 * The app's toasts (DESIGN_SYSTEM §7): bottom center, popover colors, 4s. Dark only, so the
 * theme is fixed rather than read from the OS.
 */
export function Toaster() {
  return <BaseToaster theme="dark" position="bottom-center" duration={4000} />
}
