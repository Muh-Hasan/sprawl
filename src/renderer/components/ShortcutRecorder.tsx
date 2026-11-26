import { useEffect, useState } from 'react'
import { acceleratorFromEvent, acceleratorKeys, isValidAccelerator } from '@shared/accelerator'
import { Button } from '@/components/ui/button'
import { ShortcutKbd } from './ShortcutKbd'

export interface RecordResult {
  ok: boolean
  conflict?: boolean
}

interface ShortcutRecorderProps {
  /** The current shortcut, e.g. `Ctrl+Shift+Space`. */
  value: string
  /** Tries the new shortcut; a conflict keeps the old one. */
  onRecord(accel: string): Promise<RecordResult>
  /** Recording started or stopped (main lets go of the shortcut meanwhile). */
  onRecordingChange?(recording: boolean): void
  testId?: string
}

type Message = { kind: 'conflict' | 'hint'; text: string } | null

/**
 * A global-shortcut field (UI_SPEC §9): the combo as `kbd` keys and "Change". While recording,
 * the next combo with Ctrl, Alt or Win is tried; Esc cancels. A combo another app holds shows
 * "Already used by another app" and the old one stays.
 */
export function ShortcutRecorder({
  value,
  onRecord,
  onRecordingChange,
  testId = 'shortcut-recorder',
}: ShortcutRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  const stop = (): void => {
    setRecording(false)
    onRecordingChange?.(false)
  }

  useEffect(() => {
    if (!recording) return
    const onKeyDown = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        setMessage(null)
        stop()
        return
      }
      const accel = acceleratorFromEvent(e)
      if (accel === null) return // only modifiers so far
      if (!isValidAccelerator(accel)) {
        setMessage({ kind: 'hint', text: 'Use Ctrl, Alt or Win with a key' })
        return
      }
      stop()
      void onRecord(accel).then((result) =>
        setMessage(
          result.ok
            ? null
            : {
                kind: 'conflict',
                text: result.conflict
                  ? 'Already used by another app'
                  : "Couldn't use that shortcut",
              },
        ),
      )
    }
    const onBlur = (): void => stop()
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('blur', onBlur)
    }
    // `stop` and `onRecord` only change with the props they read; the listener is per recording.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  return (
    <div data-testid={testId} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {recording ? (
          <span data-testid={`${testId}-recording`} className="text-xs text-muted-foreground">
            Press a shortcut…
          </span>
        ) : (
          <span data-testid={`${testId}-value`} className="flex items-center gap-1">
            {acceleratorKeys(value).map((key) => (
              <ShortcutKbd key={key}>{key}</ShortcutKbd>
            ))}
          </span>
        )}
        <Button
          data-testid={`${testId}-change`}
          variant="secondary"
          size="sm"
          onClick={() => {
            if (recording) return stop()
            setMessage(null)
            setRecording(true)
            onRecordingChange?.(true)
          }}
        >
          {recording ? 'Cancel' : 'Change'}
        </Button>
      </div>
      {message && (
        <span
          data-testid={`${testId}-message`}
          className={
            message.kind === 'conflict'
              ? 'text-xs text-destructive'
              : 'text-xs text-muted-foreground'
          }
        >
          {message.text}
        </span>
      )}
    </div>
  )
}
