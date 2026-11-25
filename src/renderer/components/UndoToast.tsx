import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** Shows "<message> · Undo" (UI_SPEC §11). The Undo button runs `onUndo` and closes the toast. */
export function showUndoToast(message: string, onUndo: () => void): void {
  const id = toast(message, {
    action: (
      <Button
        data-testid="toast-undo"
        variant="ghost"
        size="xs"
        className="ml-auto text-foreground hover:bg-muted"
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
