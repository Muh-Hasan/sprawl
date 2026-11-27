import type { ReactNode } from 'react'

/**
 * A settings section's page (UI_SPEC §9): a 20px title and a one-line blurb over a card of rows,
 * then anything that sits below the card (About's logo).
 */
export function SettingsSection({
  title,
  blurb,
  testId,
  children,
  after,
}: {
  title: string
  blurb: string
  testId?: string
  children: ReactNode
  after?: ReactNode
}) {
  return (
    <section data-testid={testId} aria-labelledby={`${testId}-title`} className="flex flex-col">
      <h2 id={`${testId}-title`} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
      <div className="mt-5 flex flex-col divide-y divide-muted rounded-[14px] border border-muted bg-card">
        {children}
      </div>
      {after}
    </section>
  )
}

/**
 * A settings row (UI_SPEC §9), at least 64px: the label (15px 500) and an optional description
 * on the left, the control on the right. `soon` marks a row that works in a later release.
 */
export function SettingsRow({
  label,
  description,
  soon = false,
  testId,
  children,
}: {
  label: ReactNode
  description?: ReactNode
  soon?: boolean
  testId?: string
  children?: ReactNode
}) {
  return (
    <div
      data-testid={testId}
      data-soon={soon || undefined}
      className="flex min-h-16 items-center gap-4 px-[18px] py-3"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-base font-medium">
          {label}
          {soon && <ComingSoon />}
        </span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}

/** The "Coming soon" badge on rows whose feature isn't built yet. */
function ComingSoon() {
  return (
    <span className="rounded-md bg-muted px-1.5 py-px text-2xs font-medium text-muted-foreground">
      Coming soon
    </span>
  )
}
