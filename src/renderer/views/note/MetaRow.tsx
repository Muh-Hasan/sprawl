import type { TablerIcon } from '@tabler/icons-react'

interface MetaRowProps {
  icon: TablerIcon
  /** The subtle label in the left column. */
  label: string
  children?: React.ReactNode
  'data-testid'?: string
}

/**
 * A row of the meta section (UI_SPEC §5): a 96px label column (110px on the full page) with a
 * 16px icon and the label in subtle `text-sm`, then the value. Rows are at least 32px; a value
 * that stacks (the links) grows downwards with the label staying on its first line.
 */
export function MetaRow({ icon: Icon, label, children, ...props }: MetaRowProps) {
  return (
    <div data-testid={props['data-testid']} className="flex items-start gap-2 text-sm">
      <div className="flex h-8 w-24 shrink-0 items-center gap-2 text-subtle-foreground group-data-[mode=full]/panel:w-[110px]">
        <Icon className="size-4 shrink-0" stroke={1.75} aria-hidden />
        {label}
      </div>
      <div className="flex min-h-8 min-w-0 flex-1 items-center">{children}</div>
    </div>
  )
}
