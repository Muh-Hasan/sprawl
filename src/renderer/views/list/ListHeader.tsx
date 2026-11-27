import { IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useListStore } from '@/stores/listStore'
import { createListNote } from './listActions'
import { countLabel } from './listLogic'

/**
 * The List's header (UI_SPEC §5b): the "List" title, the Notes / Drawings switch with the current
 * tab's count, and New note. Drawings joins the switch with drawings (phase 8); until then Notes
 * is its only tab.
 */
export function ListHeader({ count }: { count: number | null }) {
  const tab = useListStore((s) => s.filter.tab)
  return (
    <div className="flex items-center gap-6">
      <h1 className="text-title">List</h1>
      <div role="tablist" aria-label="Show" className="flex gap-1">
        <button
          type="button"
          role="tab"
          aria-selected
          data-testid="list-kind-notes"
          className="flex h-[34px] items-center gap-2 rounded-[9px] bg-muted px-3 text-base font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Notes
          <span data-testid="list-count" className="text-xs font-normal text-subtle-foreground">
            {count !== null && countLabel(tab, count)}
          </span>
        </button>
      </div>
      <Button
        data-testid="list-new-note"
        variant="secondary"
        className="ml-auto"
        onClick={() => void createListNote()}
      >
        <IconPlus stroke={2} aria-hidden />
        New note
      </Button>
    </div>
  )
}
