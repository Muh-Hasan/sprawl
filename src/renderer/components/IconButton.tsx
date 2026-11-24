import type { TablerIcon } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { HintTooltip } from './HintTooltip'

interface IconButtonProps extends Omit<React.ComponentProps<typeof Button>, 'children'> {
  icon: TablerIcon
  /** The tooltip and the accessible name. */
  label: string
  shortcut?: string
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  /** Pressed / active state: `--muted` background and a `--foreground` icon. */
  active?: boolean
}

/**
 * A ghost icon button with a tooltip (DESIGN_SYSTEM §7): 32×32, a 16px icon in
 * `--muted-foreground` that turns `--foreground` on hover or when active. Inside the 40px
 * title strip it's `no-drag`, so it stays clickable.
 */
export function IconButton({
  icon: Icon,
  label,
  shortcut,
  tooltipSide,
  active = false,
  className,
  ...props
}: IconButtonProps) {
  return (
    <HintTooltip label={label} shortcut={shortcut} side={tooltipSide}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        data-active={active || undefined}
        className={cn(
          'text-muted-foreground [-webkit-app-region:no-drag] hover:bg-muted hover:text-foreground dark:hover:bg-muted',
          'data-active:bg-muted data-active:text-foreground',
          className,
        )}
        {...props}
      >
        <Icon stroke={1.75} />
      </Button>
    </HintTooltip>
  )
}
