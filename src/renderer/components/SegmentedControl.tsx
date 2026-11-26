import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly { value: T; label: string }[]
  onChange(value: T): void
  label: string
  /** `sm` for the list filter, `xs` (24px) for the capture window. */
  size?: 'sm' | 'xs'
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
      className={cn('gap-0.5', className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          data-testid={`${testIdPrefix}-${o.value}`}
          className={cn(
            'rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground data-[state=on]:bg-muted data-[state=on]:text-foreground',
            size === 'xs' ? 'h-6 min-w-0 px-2' : 'h-7',
          )}
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
