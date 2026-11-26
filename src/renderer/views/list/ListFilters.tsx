import { IconSearch } from '@tabler/icons-react'
import { NOTE_COLORS } from '@shared/constants'
import type { ListSort, ListTab } from '@shared/types'
import { HintTooltip } from '@/components/HintTooltip'
import { SegmentedControl } from '@/components/SegmentedControl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COLOR_NAMES, NOTE_COLOR_CLASSES } from '@/lib/noteColors'
import { cn } from '@/lib/utils'
import { useListStore } from '@/stores/listStore'

const TABS: readonly { value: ListTab; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'due', label: 'Due' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All' },
]

const SORTS: readonly { value: ListSort; label: string }[] = [
  { value: 'edited', label: 'Recently edited' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'due', label: 'Due date' },
]

/**
 * The filter bar (UI_SPEC §5b): the tabs, the six color dots (none selected shows every color),
 * the title filter and the sort. Due always sorts by due date and Done by when, so the sort
 * shows only on Open and All.
 */
export function ListFilters({ onFilterKey }: { onFilterKey(e: React.KeyboardEvent): void }) {
  const filter = useListStore((s) => s.filter)
  const text = useListStore((s) => s.text)
  const list = useListStore.getState
  return (
    <div className="mt-3 flex h-10 items-center gap-4">
      <SegmentedControl
        label="Show"
        value={filter.tab}
        options={TABS}
        onChange={(tab) => list().setTab(tab)}
        testIdPrefix="list-tab"
      />
      <div role="group" aria-label="Colors" className="flex items-center gap-2">
        {NOTE_COLORS.map((color) => {
          const on = filter.colors.includes(color)
          return (
            <HintTooltip key={color} label={COLOR_NAMES[color]}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={COLOR_NAMES[color]}
                data-testid={`list-color-${color}`}
                onClick={() => list().toggleColor(color)}
                className={cn(
                  'size-3.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  NOTE_COLOR_CLASSES[color].swatch,
                  on && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                )}
              />
            </HintTooltip>
          )
        })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <label className="relative flex items-center">
          <IconSearch
            aria-hidden
            className="pointer-events-none absolute left-2 size-3.5 text-subtle-foreground"
          />
          <input
            data-testid="list-filter"
            value={text}
            placeholder="Filter by title"
            aria-label="Filter by title"
            onChange={(e) => list().setText(e.target.value)}
            onKeyDown={onFilterKey}
            className="h-7 w-[200px] rounded-md border border-input bg-transparent pr-2 pl-7 text-xs outline-none placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </label>
        {(filter.tab === 'open' || filter.tab === 'all') && (
          <Select value={filter.sort} onValueChange={(v) => list().setSort(v as ListSort)}>
            <SelectTrigger data-testid="list-sort" size="sm" className="h-7 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem
                  key={s.value}
                  value={s.value}
                  data-testid={`list-sort-${s.value}`}
                  className="text-xs"
                >
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
