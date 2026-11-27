import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  value: T
  /** A `count` shows after the label, smaller and muted (the List's tabs). */
  options: readonly { value: T; label: string; count?: number }[]
  onChange(value: T): void
  label: string
  /**
   * `md` (32px, in a bordered track) for the List's tabs, `sm` for settings, `xs` (26px, in a
   * small bordered track) for the capture window.
   */
  size?: 'md' | 'sm' | 'xs'
  testIdPrefix: string
  className?: string
}

/**
 * One-of-N choice (UI_SPEC §5b, §5c, §9): a single-select shadcn `ToggleGroup`, ghost style, with
 * the selected item on `--muted`. Clicking the selected item keeps it (never none).
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'sm',
  testIdPrefix,
  className,
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className={cn(
        'gap-0.5',
        size === 'md' && 'rounded-[11px] border border-border bg-card p-[3px]',
        size === 'xs' && 'rounded-lg border border-border bg-background p-0.5',
        className,
      )}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          data-testid={`${testIdPrefix}-${o.value}`}
          className={cn(
            'group/seg rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground data-[state=on]:bg-muted data-[state=on]:text-foreground',
            size === 'xs' && 'h-[26px] min-w-0 rounded-md px-2.5',
            size === 'sm' && 'h-7',
            size === 'md' && 'h-8 gap-1.5 rounded-lg px-3.5 text-sm',
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span
              data-testid={`${testIdPrefix}-${o.value}-count`}
              className="text-2xs text-subtle-foreground tabular-nums group-data-[state=on]/seg:text-muted-foreground"
            >
              {o.count}
            </span>
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
