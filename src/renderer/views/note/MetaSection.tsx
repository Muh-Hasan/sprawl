import { useState } from 'react'
import { IconBell, IconCalendarDue, IconPalette } from '@tabler/icons-react'
import { dueLongLabel, dueState, reminderLabel } from '@shared/due'
import { Chip } from '@/components/Chip'
import { ColorSwatches } from '@/components/ColorSwatches'
import { DuePicker } from '@/components/DuePicker'
import { useClockStore } from '@/stores/clockStore'
import { useNoteStore } from '@/stores/noteStore'
import { useUiStore } from '@/stores/uiStore'
import { LinksSection } from './LinksSection'
import { MetaRow } from './MetaRow'

/**
 * The meta section under the body (UI_SPEC §5): links, the due date (with time and reminder),
 * the reminder line and the color. later: phase-9 adds "Linked from".
 */
export function MetaSection() {
  const note = useNoteStore((s) => s.note)
  if (!note) return null
  return (
    <section
      data-testid="note-meta"
      className="mt-8 flex flex-col gap-0.5 border-t border-border pt-4 pb-6"
    >
      <LinksSection links={note.links} />
      <DueRow />
      {note.remind !== 'none' && note.remindAt !== null && (
        <MetaRow data-testid="note-reminder" icon={IconBell}>
          <ReminderText remindAt={note.remindAt} fired={note.remindedAt !== null} />
        </MetaRow>
      )}
      <MetaRow icon={IconPalette} label="Color">
        <ColorSwatches
          value={note.color}
          testIdPrefix="note-color"
          onChange={(color) => useNoteStore.getState().setColor(color)}
        />
      </MetaRow>
    </section>
  )
}

function ReminderText({ remindAt, fired }: { remindAt: number; fired: boolean }) {
  const now = useClockStore((s) => s.now)
  if (fired) return <span className="text-subtle-foreground">Reminded</span>
  return <span className="text-muted-foreground">Reminds you {reminderLabel(remindAt, now)}</span>
}

function DueRow() {
  const note = useNoteStore((s) => s.note)
  const now = useClockStore((s) => s.now)
  // The canvas menu's Due date… opens the panel with the picker showing.
  const requested = useUiStore((s) => s.duePickerRequested)
  const [picking, setPicking] = useState(false)
  const open = picking || requested
  const setOpen = (next: boolean): void => {
    setPicking(next)
    if (!next) useUiStore.getState().takeDuePickerRequest()
  }
  if (!note) return null
  const { dueDay, dueTime, remind } = note

  return (
    <MetaRow icon={IconCalendarDue} label="Due">
      <DuePicker
        value={{ dueDay, dueTime, remind }}
        onChange={(patch) => useNoteStore.getState().edit(patch)}
        open={open}
        onOpenChange={setOpen}
      >
        {dueDay === null ? (
          <button
            type="button"
            data-testid="note-due"
            className="-mx-1.5 flex h-7 items-center rounded-md px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Add due date
          </button>
        ) : (
          <button
            type="button"
            data-testid="note-due"
            className="rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Chip
              data-testid="note-due-chip"
              icon={IconCalendarDue}
              due={dueState(dueDay, dueTime, now)}
              className="h-6 text-xs"
            >
              {dueLongLabel(dueDay, dueTime)}
            </Chip>
          </button>
        )}
      </DuePicker>
    </MetaRow>
  )
}
