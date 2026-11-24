import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm(): void
  /** Deletes: `--destructive` text on `--muted`, solid only on hover. */
  destructive?: boolean
  testId?: string
}

/**
 * The confirm dialog (UI_SPEC §11): 400px, a 14px/600 title, a muted description, and Cancel
 * (ghost) plus the confirm button. Used only for changing the vault and deleting a drawing.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  testId,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-testid={testId}
        className="gap-5 rounded-xl border-border bg-popover p-5 shadow-(--shadow-popover) data-[size=default]:sm:max-w-[400px]"
      >
        <AlertDialogHeader className="gap-1.5">
          <AlertDialogTitle className="text-base font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" size="sm" data-testid={testId && `${testId}-cancel`}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'secondary' : 'default'}
            size="sm"
            data-testid={testId && `${testId}-confirm`}
            className={cn(
              destructive && 'text-destructive hover:bg-destructive hover:text-background',
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
