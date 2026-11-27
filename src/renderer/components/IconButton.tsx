import type { TablerIcon } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { HintTooltip } from './HintTooltip'

const SIZES = {
  default: "size-9 [&_svg:not([class*='size-'])]:size-[18px]",
  md: "size-8 [&_svg:not([class*='size-'])]:size-[17px]",
  sm: "size-7 [&_svg:not([class*='size-'])]:size-4",
} as const

interface IconButtonProps extends Omit<React.ComponentProps<typeof Button>, 'children' | 'size'> {
  icon: TablerIcon
  /** The tooltip and the accessible name. */
  label: string
  shortcut?: string
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  /** Pressed / active state: `--muted` background and a `--foreground` icon. */
  active?: boolean
  /**
   * `default` is 36×36 with an 18px icon; `md` is 32×32 with a 17px icon, for panel headers;
   * `sm` is 28×28 with a 16px icon, for buttons inside rows.
   */
  size?: keyof typeof SIZES
}

/**
 * A ghost icon button with a tooltip (DESIGN_SYSTEM §7): 36×36 with an 18px icon (28×28 and
 * 16px at `size="sm"`), in `--muted-foreground` that turns `--foreground` on hover or when
 * active. Inside the 44px title strip it's `no-drag`, so it stays clickable.
 */
export function IconButton({
  icon: Icon,
  label,
  shortcut,
  tooltipSide,
  active = false,
  size = 'default',
  className,
  ...props
}: IconButtonProps) {
  return (
    <HintTooltip label={label} shortcut={shortcut} side={tooltipSide}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        data-active={active || undefined}
        className={cn(
          SIZES[size],
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
