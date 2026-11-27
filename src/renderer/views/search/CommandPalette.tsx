import { useMemo, useRef, useState } from 'react'
import { IconSearch } from '@tabler/icons-react'
import { Command as CommandPrimitive } from 'cmdk'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { ShortcutKbd } from '@/components/ShortcutKbd'
import { Command, CommandEmpty, CommandGroup, CommandList } from '@/components/ui/command'
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCanvasStore } from '@/stores/canvasStore'
import { useUiStore } from '@/stores/uiStore'
import { matchCommands, newNote, openNoteResult, paletteCommands } from './commands'
import { CommandResult, NoteResult } from './PaletteRows'
import { parseQuery } from './paletteQuery'
import { useNoteResults } from './useNoteResults'

const PLACEHOLDER = 'Search notes, or type > for commands'

/** Group headings: 12px 500 in `--subtle-foreground`. */
const GROUP =
  'p-0 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:text-subtle-foreground'

function Hint({ keys, children }: { keys: string; children: React.ReactNode }) {
  return (
    <span>
      <kbd className="font-mono text-kbd text-muted-foreground">{keys}</kbd> {children}
    </span>
  )
}

/**
 * What the palette shows while open: the input, note results and commands. It mounts with the
 * dialog, so each opening starts empty.
 */
function PaletteBody({ onRun }: { onRun(fn: () => void): void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const { commandsOnly, term } = parseQuery(query)
  const notes = useNoteResults(term, !commandsOnly)
  const showDone = useCanvasStore((s) => s.showDone)
  const commands = useMemo(
    () => matchCommands(paletteCommands({ showDone }), term),
    [showDone, term],
  )
  const values = [...notes.map((n) => `note:${n.id}`), ...commands.map((c) => `command:${c.id}`)]
  // A new query (or results that no longer hold the selection) selects the first result.
  const value = values.includes(selected) ? selected : (values[0] ?? '')
  const canCreate = !commandsOnly && term !== ''

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key !== 'Enter' || values.length > 0 || !canCreate) return
    e.preventDefault()
    onRun(() => newNote(term))
  }

  return (
    <Command
      shouldFilter={false}
      loop
      value={value}
      onValueChange={setSelected}
      onKeyDown={onKeyDown}
      className="h-auto rounded-none bg-transparent text-foreground"
    >
      <div className="flex h-[60px] items-center gap-3 border-b border-border px-5">
        <IconSearch aria-hidden className="size-5 shrink-0 text-muted-foreground" stroke={1.75} />
        <CommandPrimitive.Input
          data-testid="palette-input"
          aria-label="Search notes or run a command"
          value={query}
          onValueChange={(q) => {
            setQuery(q)
            setSelected('')
          }}
          placeholder={PLACEHOLDER}
          className="h-10 min-w-0 flex-1 bg-transparent text-[17px] text-foreground outline-none placeholder:text-subtle-foreground"
        />
        <ShortcutKbd>Esc</ShortcutKbd>
      </div>
      <CommandList className="max-h-[min(460px,60vh)] scroll-py-2 p-2">
        <CommandEmpty
          data-testid="palette-empty"
          className="px-3 py-10 text-center text-sm text-muted-foreground"
        >
          {canCreate ? (
            <>
              No notes or commands match. Press <ShortcutKbd>Enter</ShortcutKbd> to create a note
              called “{term}”.
            </>
          ) : (
            'No commands match.'
          )}
        </CommandEmpty>
        {notes.length > 0 && (
          <CommandGroup heading="Notes" className={GROUP}>
            {notes.map((row) => (
              <NoteResult
                key={row.id}
                row={row}
                onSelect={() => onRun(() => openNoteResult(row))}
              />
            ))}
          </CommandGroup>
        )}
        {commands.length > 0 && (
          <CommandGroup heading="Commands" className={GROUP}>
            {commands.map((command) => (
              <CommandResult
                key={command.id}
                command={command}
                onSelect={() => onRun(command.run)}
              />
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex h-10 items-center gap-4 border-t border-border px-4 text-2xs text-subtle-foreground">
        <Hint keys="↑↓">move</Hint>
        <Hint keys="Enter">open</Hint>
        <Hint keys="Esc">close</Hint>
        <span className="ml-auto">
          Type <kbd className="font-mono text-kbd text-muted-foreground">&gt;</kbd> for commands
          only
        </span>
      </div>
    </Command>
  )
}

/**
 * The command palette (UI_SPEC §8): Ctrl+K or the rail's Search. It finds notes by title and
 * runs commands; `>` lists commands only (PRODUCT §3.6).
 */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen)
  const setOpen = useUiStore((s) => s.setPaletteOpen)
  // Set when a result ran, so closing leaves focus where the result put it (a new card's text).
  const ran = useRef(false)
  // What had focus before it opened (the editor, a rail button). There's no dialog trigger for
  // Radix to go back to, so Esc puts focus back here.
  const returnTo = useRef<HTMLElement | null>(null)

  const onRun = (fn: () => void): void => {
    ran.current = true
    setOpen(false)
    // Once the dialog has let go of focus, so whatever the result focuses keeps it.
    requestAnimationFrame(fn)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-overlay backdrop-blur-[2px] motion-reduce:animate-none" />
        <DialogPrimitive.Content
          data-testid="palette"
          onOpenAutoFocus={() => {
            const active = document.activeElement
            returnTo.current = active instanceof HTMLElement ? active : null
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            if (!ran.current) returnTo.current?.focus({ preventScroll: true })
            ran.current = false
            returnTo.current = null
          }}
          className="fixed top-[13vh] left-1/2 z-50 w-[640px] max-w-[calc(100%-2rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-(--shadow-palette) duration-200 ease-(--ease-out) outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98 data-[state=open]:slide-in-from-top-1.5 motion-reduce:animate-none"
        >
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <DialogDescription className="sr-only">{PLACEHOLDER}</DialogDescription>
          <PaletteBody onRun={onRun} />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
