// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '../../../../../src/renderer/components/ui/tooltip'
import { Entry, type EntryActions } from '../../../../../src/renderer/views/log/Entry'
import type { LogEntry } from '../../../../../src/shared/types'

afterEach(cleanup)

const at = new Date(2026, 10, 25, 18, 30).getTime()

const entry = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: 'e1',
  day: '2026-11-25',
  at,
  kind: 'manual',
  text: 'Called **the bank**',
  noteId: null,
  note: null,
  createdAt: at,
  ...over,
})

function setup(e: LogEntry) {
  const actions: EntryActions = { openNote: vi.fn(), update: vi.fn(), remove: vi.fn() }
  render(
    <TooltipProvider>
      <Entry entry={e} {...actions} />
    </TooltipProvider>,
  )
  return actions
}

describe('log Entry', () => {
  it('shows a done entry with the live title and color tag, and opens its note', () => {
    const actions = setup(
      entry({
        kind: 'done',
        text: 'Old title',
        noteId: 'n1',
        note: { title: 'Call the bank', color: 'sage' },
      }),
    )
    expect(screen.getByTestId('log-entry-time').textContent).toBe('18:30')
    expect(screen.getByTestId('log-entry-text').textContent).toBe('Call the bank')
    expect(screen.getByTestId('log-entry-color').textContent).toBe('Sage')
    fireEvent.click(screen.getByTestId('log-entry-open'))
    expect(actions.openNote).toHaveBeenCalledWith('n1')
  })

  it("falls back to the title snapshot once the note is gone, and doesn't open", () => {
    const actions = setup(entry({ kind: 'done', text: 'Old title', noteId: null, note: null }))
    expect(screen.getByTestId('log-entry-text').textContent).toBe('Old title')
    expect(screen.queryByTestId('log-entry-color')).toBeNull()
    expect((screen.getByTestId('log-entry-open') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByTestId('log-entry-open'))
    expect(actions.openNote).not.toHaveBeenCalled()
  })

  it('renders a manual entry as inline markdown', () => {
    setup(entry())
    expect(screen.getByTestId('log-entry-text').querySelector('strong')?.textContent).toBe(
      'the bank',
    )
  })

  it('edits the text: Enter saves, Esc cancels', () => {
    const actions = setup(entry())
    fireEvent.click(screen.getByTestId('log-entry-edit'))
    const input = screen.getByTestId('log-entry-input') as HTMLInputElement
    expect(input.value).toBe('Called **the bank**')
    fireEvent.change(input, { target: { value: '  Paid the bill ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(actions.update).toHaveBeenCalledWith('e1', { text: 'Paid the bill' })

    fireEvent.click(screen.getByTestId('log-entry-edit'))
    const again = screen.getByTestId('log-entry-input')
    fireEvent.change(again, { target: { value: 'Nope' } })
    fireEvent.keyDown(again, { key: 'Escape' })
    expect(actions.update).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('log-entry-input')).toBeNull()
  })

  it('edits the time by clicking it, reading typed times', () => {
    const actions = setup(entry())
    fireEvent.click(screen.getByTestId('log-entry-time'))
    const input = screen.getByTestId('log-entry-time-input')
    fireEvent.change(input, { target: { value: '930' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(actions.update).toHaveBeenCalledWith('e1', { time: '09:30' })

    fireEvent.click(screen.getByTestId('log-entry-time'))
    const bad = screen.getByTestId('log-entry-time-input')
    fireEvent.change(bad, { target: { value: 'soon' } })
    fireEvent.blur(bad)
    expect(actions.update).toHaveBeenCalledTimes(1)
  })

  it('deletes a manual entry', () => {
    const e = entry()
    const actions = setup(e)
    fireEvent.click(screen.getByTestId('log-entry-delete'))
    expect(actions.remove).toHaveBeenCalledWith(e)
  })
})
