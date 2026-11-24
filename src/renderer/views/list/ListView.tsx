import { IconListCheck } from '@tabler/icons-react'
import { EmptyState } from '@/components/EmptyState'
import { TopBar } from '@/components/TopBar'

/** The list view (UI_SPEC §5b). later: phase-6 adds the header, filters and rows. */
export function ListView() {
  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar />
      <div className="min-h-0 flex-1">
        <EmptyState icon={IconListCheck} testId="list-empty">
          All clear. Nothing open right now.
        </EmptyState>
      </div>
    </div>
  )
}
