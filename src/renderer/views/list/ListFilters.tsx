import { IconSearch } from '@tabler/icons-react'
import { NOTE_COLORS } from '@shared/constants'
import type { ListSort, ListTab, NoteListCounts } from '@shared/types'
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

interface ListFiltersProps {
  /** How many notes each tab holds, shown on the tabs once known. */
  counts: NoteListCounts | null
  onFilterKey(e: React.KeyboardEvent): void
}

/**
 * The filter bar (UI_SPEC §5b): the tabs with their counts, the six color dots (none selected
 * shows every color), the title filter and the sort. Due always sorts by due date and Done by
 * when, so the sort shows only on Open and All.
 */
export function ListFilters({ counts, onFilterKey }: ListFiltersProps) {
  const filter = useListStore((s) => s.filter)
  const text = useListStore((s) => s.text)
  const list = useListStore.getState
  const tabs = TABS.map((t) => ({ ...t, count: counts?.[t.value] }))
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
      <SegmentedControl
        label="Filter"
        value={filter.tab}
        options={tabs}
        size="md"
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
      {/* The search box narrows before the row wraps (a narrow window, the note panel open). */}
      <div className="flex min-w-0 flex-1 basis-80 items-center justify-end gap-3">
        <label className="relative flex max-w-60 min-w-36 flex-1 items-center">
          <IconSearch
            aria-hidden
            className="pointer-events-none absolute left-3 size-[17px] text-muted-foreground"
          />
          <input
            data-testid="list-filter"
            value={text}
            placeholder="Filter notes"
            aria-label="Filter by title"
            onChange={(e) => list().setText(e.target.value)}
            onKeyDown={onFilterKey}
            className="h-9 w-full rounded-[10px] border border-border bg-card pr-3 pl-9 text-sm outline-none placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </label>
        {(filter.tab === 'open' || filter.tab === 'all') && (
          <Select value={filter.sort} onValueChange={(v) => list().setSort(v as ListSort)}>
            <SelectTrigger
              data-testid="list-sort"
              aria-label="Sort"
              className="h-9 w-auto gap-2 rounded-[10px] border-border bg-card text-sm dark:bg-card"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem
                  key={s.value}
                  value={s.value}
                  data-testid={`list-sort-${s.value}`}
                  className="text-sm"
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
