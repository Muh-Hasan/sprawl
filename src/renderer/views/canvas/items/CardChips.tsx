import { IconCalendarDue, IconChecklist, IconLink, IconPaperclip } from '@tabler/icons-react'
import { dueChipLabel, dueState } from '@shared/due'
import type { CardNote } from '@shared/types'
import { Chip } from '@/components/Chip'
import { useClockStore } from '@/stores/clockStore'

/**
 * A note card's chips row (UI_SPEC §4.5): checklist progress, links, attachments and the due
 * date, each only when there's something to show. Nothing renders for a note without any.
 */
export function CardChips({ note }: { note: CardNote }) {
  const { checkTotal, checkDone, linkCount, attachCount, dueDay } = note
  if (checkTotal === 0 && linkCount === 0 && attachCount === 0 && dueDay === null) return null
  return (
    <div data-testid="note-card-chips" className="mt-2.5 flex flex-wrap gap-1.5">
      {checkTotal > 0 && (
        <Chip data-testid="chip-checklist" icon={IconChecklist}>
          {checkDone}/{checkTotal}
        </Chip>
      )}
      {linkCount > 0 && (
        <Chip data-testid="chip-links" icon={IconLink}>
          {linkCount}
        </Chip>
      )}
      {attachCount > 0 && (
        <Chip data-testid="chip-attachments" icon={IconPaperclip}>
          {attachCount}
        </Chip>
      )}
      {dueDay !== null && <DueChip dueDay={dueDay} dueTime={note.dueTime} />}
    </div>
  )
}

function DueChip({ dueDay, dueTime }: { dueDay: string; dueTime: string | null }) {
  const now = useClockStore((s) => s.now)
  return (
    <Chip data-testid="chip-due" icon={IconCalendarDue} due={dueState(dueDay, dueTime, now)}>
      {dueChipLabel(dueDay, now)}
    </Chip>
  )
}
