import type { TablerIcon } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ToastIcon } from './ToastIcon'

interface ToastOptions {
  icon: TablerIcon
  /** The icon in `--foreground` (Marked done) rather than `--muted-foreground`. */
  strong?: boolean
  /** Adds an Undo button that runs this and closes the toast. */
  onUndo?: () => void
}

/**
 * Shows a toast (UI_SPEC §11): the icon, the message, and Undo where it applies. The Toaster
 * puts it at the bottom center for 4 seconds.
 */
export function showToast(message: string, { icon, strong = false, onUndo }: ToastOptions): void {
  const id = toast(message, {
    icon: (
      <ToastIcon icon={icon} className={strong ? 'text-foreground' : 'text-muted-foreground'} />
    ),
    action: onUndo && (
      <Button
        data-testid="toast-undo"
        variant="ghost"
        size="sm"
        className="ml-auto px-3 font-semibold text-foreground hover:bg-muted"
        onClick={() => {
          onUndo()
          toast.dismiss(id)
        }}
      >
        Undo
      </Button>
    ),
  })
}
