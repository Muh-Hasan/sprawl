import type { TablerIcon } from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: TablerIcon
  children: ReactNode
  /** An optional ghost button under the line. */
  action?: ReactNode
  testId?: string
}

/** DESIGN_SYSTEM §8: a 20px Tabler icon in subtle text, one 13px line, an optional button. */
export function EmptyState({ icon: Icon, children, action, testId }: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <Icon className="size-5 text-subtle-foreground" stroke={1.75} aria-hidden />
      <p className="text-sm text-muted-foreground">{children}</p>
      {action}
    </div>
  )
}
