import type { TablerIcon } from '@tabler/icons-react'
import type { DueState } from '@shared/due'
import { cn } from '@/lib/utils'

/** The due-chip colors by state (UI_SPEC §4.5). */
const DUE_TONES: Record<DueState, string> = {
  overdue: 'bg-due-overdue-bg text-due-overdue',
  soon: 'bg-due-soon-bg text-due-soon',
  later: 'bg-due-later-bg text-due-later',
}

interface ChipProps {
  icon: TablerIcon
  children: React.ReactNode
  /** A due chip's state; other chips take the card's text color on a faint white. */
  due?: DueState
  className?: string
  'data-testid'?: string
}

/**
 * A card chip (UI_SPEC §4.5): 20px tall, radius 5, `text-2xs` 500, a 12px icon and a 4px gap.
 * Plain chips sit on `rgb(255 255 255 / .06)` in the note's text color.
 */
export function Chip({ icon: Icon, children, due, className, ...props }: ChipProps) {
  return (
    <span
      data-testid={props['data-testid']}
      data-due={due}
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-[5px] px-1.5 text-2xs font-medium whitespace-nowrap',
        due ? DUE_TONES[due] : 'bg-note-chip',
        className,
      )}
    >
      <Icon className="size-3 shrink-0" stroke={2} aria-hidden />
      {children}
    </span>
  )
}
