import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DUE_GROUP_LABELS, type DueGroup } from './listLogic'

const HEADING_COLOR: Record<DueGroup, string> = {
  overdue: 'text-due-overdue',
  today: 'text-foreground',
  tomorrow: 'text-foreground',
  week: 'text-muted-foreground',
  later: 'text-muted-foreground',
  none: 'text-subtle-foreground',
}

/**
 * One due group of the Open and Due tabs (UI_SPEC §5b): a sticky heading with the group's name
 * and how many rows it holds, then its rows.
 */
export function ListGroup({
  group,
  count,
  children,
}: {
  group: DueGroup
  count: number
  children: ReactNode
}) {
  return (
    <section data-testid={`list-group-${group}`} className="mt-5 first:mt-0">
      <h2
        className={cn(
          'sticky top-0 z-10 flex h-9 items-center gap-2 bg-background px-3 text-xs font-semibold',
          HEADING_COLOR[group],
        )}
      >
        {DUE_GROUP_LABELS[group]}
        <span data-testid="list-group-count" className="font-medium text-subtle-foreground">
          {count}
        </span>
      </h2>
      {children}
    </section>
  )
}
