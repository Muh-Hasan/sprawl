import { IconScribble } from '@tabler/icons-react'
import { EmptyState } from '@/components/EmptyState'
import { TopBar } from '@/components/TopBar'

/**
 * The drawings grid (UI_SPEC §7.1). later: phase-8 adds the grid, the "New drawing" button in
 * the top bar and in the empty state, and the editor.
 */
export function DrawingsGrid() {
  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar left="Drawings" />
      <div className="min-h-0 flex-1">
        <EmptyState icon={IconScribble} testId="drawings-empty">
          Sketch something
        </EmptyState>
      </div>
    </div>
  )
}
