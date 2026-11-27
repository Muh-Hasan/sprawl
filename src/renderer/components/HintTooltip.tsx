import type { ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { labelToHint } from '@/lib/shortcuts'

interface HintTooltipProps {
  label: string
  /** The shortcut, e.g. "Ctrl+1". It's shown with spaces ("Ctrl 1"), muted, after the label. */
  shortcut?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactElement
}

/**
 * A tooltip naming an action and its key (DESIGN_SYSTEM §7): inverted (`--foreground`
 * background, `--background` text) so it stands out over the dark app, 30px tall, a 13px 500
 * label and the shortcut in Geist Mono 11px. No arrow. The 400ms delay comes from the
 * TooltipProvider in App.
 */
export function HintTooltip({ label, shortcut, side = 'bottom', children }: HintTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={6}
        // The stock arrow would point from a tooltip that has none.
        className="flex h-[30px] items-center gap-2 rounded-lg bg-foreground px-2.5 py-0 text-xs font-medium text-background shadow-(--shadow-popover) [&>span:last-child]:hidden"
      >
        <span>{label}</span>
        {shortcut && (
          <kbd className="font-mono text-kbd font-normal text-background/55">
            {labelToHint(shortcut)}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
