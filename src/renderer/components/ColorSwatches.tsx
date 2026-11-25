import { NOTE_COLORS, type NoteColor } from '@shared/constants'
import { COLOR_NAMES, NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { cn } from '@/lib/utils'
import { HintTooltip } from './HintTooltip'

interface ColorSwatchesProps {
  value: NoteColor
  onChange(color: NoteColor): void
  /** Prefixes each swatch's testid: `<testIdPrefix>-<color>`. */
  testIdPrefix?: string
}

/**
 * The six note colors as 16px circles with an 8px gap (UI_SPEC §5). Each shows the card color
 * ringed in its bright hue, so it matches the card; the selected one gets a 2px `--foreground`
 * ring with a 2px offset.
 */
export function ColorSwatches({ value, onChange, testIdPrefix = 'color' }: ColorSwatchesProps) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex items-center gap-2">
      {NOTE_COLORS.map((color) => (
        <HintTooltip key={color} label={COLOR_NAMES[color]}>
          <button
            type="button"
            role="radio"
            aria-checked={value === color}
            aria-label={COLOR_NAMES[color]}
            data-testid={`${testIdPrefix}-${color}`}
            onClick={() => onChange(color)}
            className={cn(
              'size-4 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
              NOTE_COLOR_CLASSES[color].pickerSwatch,
              value === color && 'ring-2 ring-foreground ring-offset-2 ring-offset-surface',
            )}
          />
        </HintTooltip>
      ))}
    </div>
  )
}
