// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ShortcutRecorder,
  type RecordResult,
} from '../../../../src/renderer/components/ShortcutRecorder'

afterEach(cleanup)

function setup(result: RecordResult = { ok: true }) {
  const onRecord = vi.fn(async (_accel: string) => result)
  const onRecordingChange = vi.fn()
  const view = render(
    <ShortcutRecorder
      value="Ctrl+Shift+Space"
      onRecord={onRecord}
      onRecordingChange={onRecordingChange}
      testId="rec"
    />,
  )
  return { onRecord, onRecordingChange, ...view }
}

const keys = (): string[] =>
  Array.from(screen.getByTestId('rec-value').querySelectorAll('kbd')).map(
    (k) => k.textContent ?? '',
  )

describe('ShortcutRecorder', () => {
  it('shows the current shortcut as keys', () => {
    setup()
    expect(keys()).toEqual(['Ctrl', 'Shift', 'Space'])
  })

  it('records the next combo with a modifier and tries it', async () => {
    const { onRecord, onRecordingChange } = setup()
    fireEvent.click(screen.getByTestId('rec-change'))
    expect(screen.getByTestId('rec-recording')).toBeTruthy()
    expect(onRecordingChange).toHaveBeenLastCalledWith(true)
    // Modifiers alone don't end it.
    fireEvent.keyDown(window, { code: 'ControlLeft', ctrlKey: true })
    expect(onRecord).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.keyDown(window, { code: 'KeyK', ctrlKey: true, altKey: true })
    })
    expect(onRecord).toHaveBeenCalledWith('Ctrl+Alt+K')
    expect(onRecordingChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByTestId('rec-message')).toBeNull()
  })

  it('shows "Already used by another app" on a conflict, and keeps the old shortcut', async () => {
    const { onRecord } = setup({ ok: false, conflict: true })
    fireEvent.click(screen.getByTestId('rec-change'))
    await act(async () => {
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true, shiftKey: true })
    })
    expect(onRecord).toHaveBeenCalledWith('Ctrl+Shift+S')
    expect(screen.getByTestId('rec-message').textContent).toBe('Already used by another app')
    expect(screen.getByTestId('rec-message').className).toContain('text-destructive')
    expect(keys()).toEqual(['Ctrl', 'Shift', 'Space'])
    // Trying again clears the message.
    fireEvent.click(screen.getByTestId('rec-change'))
    expect(screen.queryByTestId('rec-message')).toBeNull()
  })

  it('asks for Ctrl, Alt or Win when a combo has none, and keeps recording', () => {
    const { onRecord } = setup()
    fireEvent.click(screen.getByTestId('rec-change'))
    fireEvent.keyDown(window, { code: 'KeyA', shiftKey: true })
    expect(onRecord).not.toHaveBeenCalled()
    expect(screen.getByTestId('rec-message').textContent).toBe('Use Ctrl, Alt or Win with a key')
    expect(screen.getByTestId('rec-recording')).toBeTruthy()
  })

  it('cancels with Esc, the Cancel button, or leaving the window', () => {
    const { onRecord, onRecordingChange } = setup()
    fireEvent.click(screen.getByTestId('rec-change'))
    fireEvent.keyDown(window, { code: 'Escape' })
    expect(screen.queryByTestId('rec-recording')).toBeNull()
    fireEvent.click(screen.getByTestId('rec-change'))
    fireEvent.click(screen.getByTestId('rec-change'))
    expect(screen.queryByTestId('rec-recording')).toBeNull()
    fireEvent.click(screen.getByTestId('rec-change'))
    fireEvent.blur(window)
    expect(screen.queryByTestId('rec-recording')).toBeNull()
    expect(onRecord).not.toHaveBeenCalled()
    expect(onRecordingChange).toHaveBeenLastCalledWith(false)
  })

  it('keeps the keys it records from reaching the rest of the app', () => {
    setup()
    const other = vi.fn()
    window.addEventListener('keydown', other)
    fireEvent.click(screen.getByTestId('rec-change'))
    fireEvent.keyDown(window, { code: 'KeyA', shiftKey: true })
    window.removeEventListener('keydown', other)
    expect(other).not.toHaveBeenCalled()
  })
})
