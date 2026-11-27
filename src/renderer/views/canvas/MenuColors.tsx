import { IconPalette } from '@tabler/icons-react'
import { NOTE_COLORS, type NoteColor } from '@shared/constants'
import { ContextMenuItem } from '@/components/Menu'
import { COLOR_NAMES, NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { cn } from '@/lib/utils'
import { setSelectionColor } from './actions'

/** "Color", then the six swatches inline (18px circles), the selection's own one ringed. */
export function ColorItems({ current }: { current: NoteColor | null }) {
  return (
    <>
      <div
        data-testid="menu-color"
        className="flex h-[34px] items-center gap-2.5 px-2.5 text-sm text-foreground/90 [&_svg]:size-4 [&_svg]:text-muted-foreground"
      >
        <IconPalette stroke={1.75} aria-hidden />
        Color
      </div>
      <div role="group" aria-label="Color" className="flex gap-1 pr-2.5 pb-1 pl-[30px]">
        {NOTE_COLORS.map((color) => (
          <ContextMenuItem
            key={color}
            data-testid={`menu-color-${color}`}
            aria-label={COLOR_NAMES[color]}
            data-current={current === color || undefined}
            className="size-[26px] min-h-0 justify-center p-0"
            onSelect={() => setSelectionColor(color)}
          >
            <span
              className={cn(
                'size-[18px] rounded-full',
                NOTE_COLOR_CLASSES[color].pickerSwatch,
                current === color &&
                  'ring-[1.5px] ring-foreground ring-offset-2 ring-offset-popover',
              )}
            />
          </ContextMenuItem>
        ))}
      </div>
    </>
  )
}
