import type { ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ShortcutKbd } from './ShortcutKbd'

interface HintTooltipProps {
  label: string
  /** Shown as a kbd on the right, e.g. "Ctrl+1". */
  shortcut?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactElement
}

/**
 * A tooltip with a label and an optional shortcut (DESIGN_SYSTEM §7): `--popover` background,
 * 12px text, no arrow. The 400ms delay comes from the TooltipProvider in App.
 */
export function HintTooltip({ label, shortcut, side = 'bottom', children }: HintTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={6}
        // The stock arrow is drawn in the white tooltip color; ours has none.
        className="rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-(--shadow-popover) [&>span:last-child]:hidden"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          {shortcut && <ShortcutKbd>{shortcut}</ShortcutKbd>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
