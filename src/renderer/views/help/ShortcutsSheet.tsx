import { useEffect, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { IconButton } from '@/components/IconButton'
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUiStore } from '@/stores/uiStore'
import { shortcutGroups, type ShortcutRow } from './shortcutGroups'
import { useSheetShortcut } from './useSheetShortcut'

const BLURB = 'Everything also works with the mouse. Ctrl K finds any action.'

/** The quick capture shortcut, read each time the sheet opens (it can change in Settings). */
function useCaptureShortcut(open: boolean): string | null {
  const [value, setValue] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    let live = true
    void window.sprawl.settings.get('captureShortcut').then((s) => live && setValue(s))
    return () => {
      live = false
    }
  }, [open])
  return value
}

function Row({ row }: { row: ShortcutRow }) {
  return (
    <div
      data-testid={`shortcut-${row.id}`}
      className="flex h-9 items-center gap-2 border-b border-border/60"
    >
      <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">{row.label}</span>
      {row.keys.map((k) => (
        <kbd
          key={k}
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-kbd text-foreground/90"
        >
          {k}
        </kbd>
      ))}
    </div>
  )
}

/**
 * The shortcuts sheet (UI_SPEC §12): every shortcut in three columns, opened with `?`, the
 * sidebar's Help and shortcuts, or the palette.
 */
export function ShortcutsSheet() {
  const open = useUiStore((s) => s.shortcutsOpen)
  const setOpen = useUiStore((s) => s.setShortcutsOpen)
  const capture = useCaptureShortcut(open)
  useSheetShortcut()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-overlay backdrop-blur-[2px] motion-reduce:animate-none" />
        <DialogPrimitive.Content
          data-testid="shortcuts-sheet"
          // Focus the sheet itself, not its close button: a focused button shows its tooltip,
          // and the first Esc would only close that.
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            if (e.currentTarget instanceof HTMLElement) e.currentTarget.focus()
          }}
          className="fixed top-20 left-1/2 z-50 max-h-[calc(100%-7rem)] w-[900px] max-w-[calc(100%-2rem)] -translate-x-1/2 overflow-y-auto rounded-[18px] border border-border bg-card shadow-(--shadow-palette) duration-200 ease-(--ease-out) outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98 motion-reduce:animate-none"
        >
          <div className="flex items-center gap-3 border-b border-border px-7 pt-[22px] pb-[18px]">
            <DialogTitle className="flex-1 text-lg font-semibold">Keyboard shortcuts</DialogTitle>
            <DialogDescription className="text-xs text-subtle-foreground">
              {BLURB}
            </DialogDescription>
            <DialogPrimitive.Close asChild>
              <IconButton
                data-testid="shortcuts-sheet-close"
                icon={IconX}
                label="Close"
                shortcut="Esc"
                size="md"
              />
            </DialogPrimitive.Close>
          </div>
          <div className="grid grid-cols-3 gap-8 px-7 pt-6 pb-7">
            {shortcutGroups(capture).map((group) => (
              <section key={group.id} aria-labelledby={`shortcuts-${group.id}`}>
                <h2
                  id={`shortcuts-${group.id}`}
                  className="mb-2.5 text-xs font-semibold text-muted-foreground"
                >
                  {group.title}
                </h2>
                {group.rows.map((row) => (
                  <Row key={row.id} row={row} />
                ))}
              </section>
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
