import { format } from 'date-fns'
import { IconCheck } from '@tabler/icons-react'
import { ShortcutKbd } from '@/components/ShortcutKbd'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useNoteStore, type SaveStatus } from '@/stores/noteStore'
import { useUiStore } from '@/stores/uiStore'

const STATUS_LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  error: "Couldn't save. Retrying…",
}

/** Mark done (Ctrl+Enter), or "Done · 18:30" with Undo once the note is done. */
function DoneControl() {
  const doneAt = useNoteStore((s) => s.note?.doneAt ?? null)
  const setDone = useNoteStore((s) => s.setDone)
  if (doneAt !== null) {
    return (
      <div className="flex items-center gap-2">
        <span data-testid="note-panel-done" className="text-sm text-muted-foreground">
          Done · {format(doneAt, 'HH:mm')}
        </span>
        <Button
          data-testid="note-panel-undo-done"
          variant="ghost"
          size="sm"
          className="text-foreground hover:bg-muted dark:hover:bg-muted"
          onClick={() => setDone(false)}
        >
          Undo
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <Button data-testid="note-panel-mark-done" size="sm" onClick={() => setDone(true)}>
        <IconCheck stroke={2} aria-hidden />
        Mark done
      </Button>
      <ShortcutKbd aria-hidden>Ctrl ↵</ShortcutKbd>
    </div>
  )
}

/**
 * The panel footer (UI_SPEC §5): sticky, 56px, with the quiet save status on the left and
 * Mark done on the right.
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
        <DoneControl />
      </div>
    </footer>
  )
}
