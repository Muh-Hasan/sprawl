import { useEffect, useMemo, useRef, useState } from 'react'
import { IconCalendarDue, IconCheck } from '@tabler/icons-react'
import { CAPTURE_FLASH_MS } from '@shared/constants'
import type { CaptureMode } from '@shared/api'
import { dueChipLabel } from '@shared/due'
import { parseCapture } from '@shared/parseCapture'
import markLight from '@/assets/brand/sprawl-mark-light.svg'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/SegmentedControl'
import { ShortcutKbd } from '@/components/ShortcutKbd'
import { clockNow, useClockStore } from '@/stores/clockStore'
import { CaptureText } from './CaptureText'
import { useShowStore } from './showStore'

const MODES = [
  { value: 'note', label: 'Note' },
  { value: 'log', label: 'Log' },
] as const

const SAVE_LABEL: Record<CaptureMode, string> = {
  note: 'Save to canvas',
  log: 'Add to today’s log',
}

const PLACEHOLDER: Record<CaptureMode, string> = {
  note: 'Write a note. The first line is the title. Try !tomorrow 15:00',
  log: 'What did you just do?',
}

/** Reports the card's height, so main fits the window to it. */
function useFitWindow(ref: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const report = (): void => void window.sprawl.capture.setHeight(Math.ceil(el.offsetHeight))
    const observer = new ResizeObserver(report)
    observer.observe(el)
    report()
    return () => observer.disconnect()
  }, [ref])
}

/**
 * The quick-capture card (PRODUCT §3.7, UI_SPEC §5c). Note mode: the first line is the title and
 * a `!date` token sets the due date (highlighted, with a preview chip). Log mode: a line in
 * today's log. Enter (or the save button, which names the destination) saves, Shift+Enter adds a
 * line, Tab switches the mode, Esc clears the text or closes. After saving, "Saved to canvas" or "Logged" shows for 600ms, then the window hides.
 */
export function CaptureBox() {
  const showRev = useShowStore((s) => s.rev)
  const now = useClockStore((s) => s.now)
  const [mode, setMode] = useState<CaptureMode>('note')
  const [text, setText] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const busy = useRef(false)
  useFitWindow(card)

  // Shown again: a fresh capture in the default mode, unless a draft is still there.
  useEffect(
    () =>
      useShowStore.subscribe((s, prev) => {
        if (s.rev === prev.rev) return
        setSaved(null)
        setError(false)
        if ((input.current?.value ?? '') === '') setMode(s.mode)
        requestAnimationFrame(() => {
          const el = input.current
          el?.focus()
          el?.setSelectionRange(el.value.length, el.value.length)
        })
      }),
    [],
  )

  const parsed = useMemo(
    () => (mode === 'note' ? parseCapture(text, now) : null),
    // `now` only matters at day boundaries; the clock store ticks every 30s.
    [mode, text, now],
  )

  const hide = (): void => void window.sprawl.capture.hide()

  const submit = async (): Promise<void> => {
    if (busy.current || text.trim() === '') return
    busy.current = true
    try {
      await window.sprawl.capture.submit({ mode, text })
      setSaved(mode === 'note' ? 'Saved to canvas' : 'Logged')
      setTimeout(() => {
        hide()
        setText('')
        setSaved(null)
        busy.current = false
      }, CAPTURE_FLASH_MS)
    } catch (err) {
      console.error('[capture] save failed', err)
      setError(true)
      busy.current = false
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      setMode((m) => (m === 'note' ? 'log' : 'note'))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (text !== '') setText('')
      else hide()
    }
  }

  const due = parsed?.due ?? null
  return (
    <div
      ref={card}
      data-testid="capture-root"
      data-mode={mode}
      className="flex flex-col overflow-hidden rounded-2xl border border-border-strong bg-card shadow-(--shadow-popover)"
    >
      {saved !== null ? (
        <div
          role="status"
          data-testid="capture-saved"
          className="flex h-[148px] flex-col items-center justify-center gap-2.5 text-base font-medium animate-in fade-in-0 motion-safe:zoom-in-95"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
            <IconCheck className="size-[22px]" stroke={2.5} aria-hidden />
          </span>
          {saved}
        </div>
      ) : (
        <div
          key={showRev}
          className="flex flex-col p-4 animate-in duration-[120ms] fade-in-0 motion-safe:slide-in-from-bottom-1.5"
        >
          <div className="flex items-center gap-2.5">
            <img src={markLight} alt="" aria-hidden className="size-4" draggable={false} />
            <SegmentedControl
              label="Capture as"
              size="xs"
              value={mode}
              options={MODES}
              onChange={(m) => {
                setMode(m)
                input.current?.focus()
              }}
              testIdPrefix="capture-mode"
            />
            <span className="ml-auto flex items-center gap-1.5 text-2xs text-subtle-foreground">
              <ShortcutKbd>Tab</ShortcutKbd> switches
            </span>
          </div>
          <div className="mt-3">
            <CaptureText
              ref={input}
              value={text}
              placeholder={PLACEHOLDER[mode]}
              token={parsed?.token ?? null}
              onChange={(v) => {
                setText(v)
                setError(false)
              }}
              onKeyDown={onKeyDown}
            />
          </div>
          {due && (
            <span
              data-testid="capture-due-chip"
              className="mt-1.5 inline-flex h-[26px] w-fit items-center gap-1.5 rounded-[7px] bg-muted px-2.5 text-xs font-medium"
            >
              <IconCalendarDue className="size-3.5" stroke={2} aria-hidden />
              Due {dueChipLabel(due.day, clockNow())}
              {due.time !== null && ` · ${due.time}`}
            </span>
          )}
          <div className="mt-3.5 flex items-center gap-3.5 border-t border-muted pt-3 text-2xs text-subtle-foreground">
            {error ? (
              <span data-testid="capture-error" className="text-destructive">
                Couldn't save. Try again.
              </span>
            ) : (
              <>
                <span>
                  <ShortcutKbd>Enter</ShortcutKbd> save
                </span>
                <span>
                  <ShortcutKbd>Shift Enter</ShortcutKbd> new line
                </span>
                <span>
                  <ShortcutKbd>Esc</ShortcutKbd> close
                </span>
              </>
            )}
            <Button
              data-testid="capture-destination"
              className="ml-auto h-[30px] rounded-lg px-3 text-xs font-semibold"
              disabled={text.trim() === ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void submit()}
            >
              {SAVE_LABEL[mode]}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
