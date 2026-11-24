import { IconNotebook } from '@tabler/icons-react'
import { EmptyState } from '@/components/EmptyState'
import { TopBar } from '@/components/TopBar'

/** The daily log (UI_SPEC §6). later: phase-5 adds the header, week strip, entries and composer. */
export function LogView() {
  return (
    <div className="flex h-full flex-col bg-surface">
      <TopBar left="Daily log" />
      <div className="min-h-0 flex-1">
        <EmptyState icon={IconNotebook} testId="log-empty">
          Nothing logged yet. Mark a note done or write what you just did.
        </EmptyState>
      </div>
    </div>
  )
}
