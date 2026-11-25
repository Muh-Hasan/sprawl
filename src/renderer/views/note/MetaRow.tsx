import type { TablerIcon } from '@tabler/icons-react'

interface MetaRowProps {
  icon: TablerIcon
  /** The muted label before the value; omitted for rows that are their own label. */
  label?: string
  children?: React.ReactNode
  'data-testid'?: string
}

/** A row of the meta section (UI_SPEC §5): 32px, `text-sm`, a 16px subtle icon. */
export function MetaRow({ icon: Icon, label, children, ...props }: MetaRowProps) {
  return (
    <div data-testid={props['data-testid']} className="flex min-h-8 items-center gap-2 text-sm">
      <Icon className="size-4 shrink-0 text-subtle-foreground" stroke={1.75} aria-hidden />
      {label && <span className="w-16 shrink-0 text-muted-foreground">{label}</span>}
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  )
}
