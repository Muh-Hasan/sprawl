import { cn } from '@/lib/utils'

/**
 * The List item's overdue count (UI_SPEC §2): a red pill, only when something is overdue. Open,
 * it sits at the row's right in place of the shortcut; collapsed, at the icon's top right.
 */
export function OverdueBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  if (count === 0) return null
  return (
    <span
      data-testid="sidebar-list-badge"
      aria-label={`${count} overdue`}
      className={cn(
        'pointer-events-none flex items-center justify-center rounded-full bg-due-overdue-bg leading-none font-semibold text-due-overdue',
        compact
          ? 'absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-2xs'
          : 'h-5 min-w-5 px-1.5 text-2xs',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
