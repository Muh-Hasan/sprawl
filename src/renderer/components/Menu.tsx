import * as ContextMenuUI from '@/components/ui/context-menu'
import * as DropdownMenuUI from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

/**
 * Sprawl's menu sizing (DESIGN_SYSTEM §7) on top of the stock shadcn menus: a 12px radius,
 * 6px padding and the popover shadow, with 34px items at `text-sm`. Use these in place of the
 * `components/ui` content and item parts; the other parts (trigger, separator, shortcut, sub)
 * come from `components/ui` unchanged.
 */
const CONTENT = 'rounded-menu p-1.5 shadow-(--shadow-popover)'
const ITEM = 'min-h-[34px] gap-2.5 rounded-lg px-2.5'

/** An item's shortcut, on the right: its keys with spaces ("Ctrl D") in Geist Mono 11px. */
export function MenuShortcut({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto pl-4 font-mono text-kbd text-subtle-foreground">{children}</span>
}

export function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuUI.DropdownMenuContent>) {
  return <DropdownMenuUI.DropdownMenuContent className={cn(CONTENT, className)} {...props} />
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuUI.DropdownMenuItem>) {
  return <DropdownMenuUI.DropdownMenuItem className={cn(ITEM, className)} {...props} />
}

export function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuUI.ContextMenuContent>) {
  return <ContextMenuUI.ContextMenuContent className={cn(CONTENT, className)} {...props} />
}

export function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuUI.ContextMenuSubContent>) {
  return <ContextMenuUI.ContextMenuSubContent className={cn(CONTENT, className)} {...props} />
}

export function ContextMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuUI.ContextMenuItem>) {
  return <ContextMenuUI.ContextMenuItem className={cn(ITEM, className)} {...props} />
}

export function ContextMenuSubTrigger({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuUI.ContextMenuSubTrigger>) {
  return <ContextMenuUI.ContextMenuSubTrigger className={cn(ITEM, className)} {...props} />
}
