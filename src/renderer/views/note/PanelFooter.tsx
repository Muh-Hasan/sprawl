import { cn } from '@/lib/utils'
import { useNoteStore, type SaveStatus } from '@/stores/noteStore'
import { useUiStore } from '@/stores/uiStore'

const STATUS_LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  error: "Couldn't save. Retrying…",
}

/**
 * The panel footer (UI_SPEC §5): sticky, 56px, with the quiet save status on the left.
 * later: phase-5 adds Mark done (Ctrl+Enter) on the right, and "Done · 18:30 · Undo".
 */
export function PanelFooter() {
  const status = useNoteStore((s) => s.status)
  const full = useUiStore((s) => s.panelMode === 'full')
  return (
    <footer className="h-14 shrink-0 border-t border-border bg-surface px-6">
      <div
        className={cn(
          'flex h-full items-center justify-between',
          full && 'mx-auto w-full max-w-[720px]',
        )}
      >
        <span
          data-testid="note-panel-status"
          data-status={status}
          aria-live="polite"
          className="text-xs text-subtle-foreground data-[status=error]:text-destructive"
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
    </footer>
  )
}
