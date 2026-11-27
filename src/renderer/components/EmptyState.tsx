import type { TablerIcon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export interface EmptyStateAction {
  label: string
  onClick(): void
  testId: string
}

interface EmptyStateProps {
  icon: TablerIcon
  title: string
  /** One line that says what to do next. */
  children: ReactNode
  /** The next step as a button under the line. */
  action?: EmptyStateAction
  testId?: string
}

/**
 * An empty state (DESIGN_SYSTEM §8, `MenusToasts`): a dashed `--border-strong` box (radius 16,
 * 28px padding) with a 28px Tabler icon, a `text-base` 600 title, one muted line that says what
 * to do next, and an optional outlined button that does it. No illustrations.
 */
export function EmptyState({ icon: Icon, title, children, action, testId }: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-2 rounded-2xl border border-dashed border-border-strong p-7 text-center"
    >
      <Icon className="size-7 text-muted-foreground" stroke={1.5} aria-hidden />
      <p className="text-base font-semibold">{title}</p>
      <p data-testid={testId && `${testId}-text`} className="text-sm text-muted-foreground">
        {children}
      </p>
      {action && (
        <Button
          variant="outline"
          size="sm"
          data-testid={action.testId}
          onClick={action.onClick}
          className="mt-2 rounded-[9px] border-border bg-popover px-3.5 hover:bg-muted dark:border-border dark:bg-popover dark:hover:bg-muted"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
