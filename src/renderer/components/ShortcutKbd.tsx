import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

/**
 * A shortcut key in Sprawl's style (DESIGN_SYSTEM §7): Geist Mono 11px (`text-kbd`), `--muted` background,
 * 1px border, 4px radius. Overrides the stock Kbd's tooltip variant too, which assumes a white
 * tooltip; ours are dark.
 */
export function ShortcutKbd({ className, ...props }: React.ComponentProps<typeof Kbd>) {
  return (
    <Kbd
      className={cn(
        'h-auto min-w-0 rounded-[4px] border border-border bg-muted px-[5px] py-[2px] font-mono text-kbd font-normal text-muted-foreground',
        '[[data-slot=tooltip-content]_&]:bg-muted [[data-slot=tooltip-content]_&]:text-muted-foreground dark:[[data-slot=tooltip-content]_&]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
