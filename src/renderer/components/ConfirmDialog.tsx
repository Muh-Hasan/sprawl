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
  /** Deletes: a solid `--destructive` button. */
  destructive?: boolean
  testId?: string
}

/**
 * The confirm dialog (UI_SPEC §11): 420px, 24px padding, a 16px radius, a `text-lg` 600 title, a
 * muted description, then Cancel (outlined) and the confirm button, both 36px. Used only for
 * changing the vault and deleting a drawing.
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
        className="gap-[22px] rounded-2xl border-border bg-card p-6 shadow-(--shadow-palette) data-[size=default]:sm:max-w-[420px]"
      >
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            data-testid={testId && `${testId}-cancel`}
            className="rounded-[10px] border-border bg-popover hover:bg-muted dark:border-border dark:bg-popover dark:hover:bg-muted"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid={testId && `${testId}-confirm`}
            className={cn(
              'rounded-[10px] font-semibold',
              destructive && 'bg-destructive text-background hover:bg-destructive/90',
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
