import type { ReactNode } from 'react'

/** A settings section (UI_SPEC §9): a 13px/600 title over its rows. Sections sit 32px apart. */
export function SettingsSection({
  title,
  testId,
  children,
}: {
  title: string
  testId?: string
  children: ReactNode
}) {
  return (
    <section data-testid={testId} className="flex flex-col">
      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
      <div className="flex flex-col">{children}</div>
    </section>
  )
}

/** A 48px settings row: label and optional description on the left, the control on the right. */
export function SettingsRow({
  label,
  description,
  children,
}: {
  label: ReactNode
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-6 py-1.5">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}
