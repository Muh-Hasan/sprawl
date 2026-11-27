import { editedLabel } from '@/lib/time'
import { useClockStore } from '@/stores/clockStore'
import { useNoteStore, type SaveStatus } from '@/stores/noteStore'

const STATUS_LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  error: "Couldn't save. Retrying…",
}

/**
 * The panel footer (UI_SPEC §5): 40px with a top border, when the note was last edited on the
 * left and the quiet save status on the right, both in subtle `text-2xs`.
 */
export function PanelFooter() {
  const status = useNoteStore((s) => s.status)
  const updatedAt = useNoteStore((s) => s.note?.updatedAt ?? null)
  const now = useClockStore((s) => s.now)
  return (
    <footer className="flex h-10 shrink-0 items-center justify-between gap-4 border-t border-border px-[18px] text-2xs font-normal text-subtle-foreground group-data-[mode=full]/panel:px-6">
      <span data-testid="note-panel-edited">
        {updatedAt !== null && editedLabel(updatedAt, now)}
      </span>
      <span
        data-testid="note-panel-status"
        data-status={status}
        aria-live="polite"
        className="data-[status=error]:text-destructive"
      >
        {STATUS_LABELS[status]}
      </span>
    </footer>
  )
}
