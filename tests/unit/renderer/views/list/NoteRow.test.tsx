// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '../../../../../src/renderer/components/ui/tooltip'
import { NoteRow, type RowActions } from '../../../../../src/renderer/views/list/NoteRow'
import type { NoteListRow } from '../../../../../src/shared/types'

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.scrollIntoView ??= () => {}
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})
afterEach(cleanup)

/** 25 Nov 2026, noon, local. */
const NOW = new Date(2026, 10, 25, 12).getTime()

function row(over: Partial<NoteListRow> = {}): NoteListRow {
  return {
    id: 'n1',
    title: 'Pay rent',
    color: 'sage',
    firstLine: 'to Sam',
    checkTotal: 0,
    checkDone: 0,
    linkCount: 0,
    dueDay: null,
    dueTime: null,
    doneAt: null,
    createdAt: NOW - 3 * 3600_000,
    updatedAt: NOW - 2 * 3600_000,
    onCanvas: true,
    ...over,
  }
}

function actions(): RowActions {
  return {
    open: vi.fn(),
    toggleDone: vi.fn(),
    showOnCanvas: vi.fn(),
    place: vi.fn(),
    duplicate: vi.fn(),
    remove: vi.fn(),
  }
}

function renderRow(r: NoteListRow, a = actions(), selected = false) {
  render(
    <TooltipProvider>
      <NoteRow row={r} now={NOW} selected={selected} leaving={false} actions={a} />
    </TooltipProvider>,
  )
  return a
}

describe('NoteRow', () => {
  it('shows the title, first line, edited time and no chips for a plain note', () => {
    renderRow(row())
    expect(screen.getByTestId('list-row-title').textContent).toBe('Pay rent')
    expect(screen.getByText('to Sam')).toBeTruthy()
    expect(screen.getByTestId('list-row-time').textContent).toBe('2h ago')
    expect(screen.queryByTestId('list-row-due')).toBeNull()
    expect(screen.queryByTestId('list-row-not-on-canvas')).toBeNull()
  })

  it('shows checklist, due and link chips, and "Not on canvas"', () => {
    renderRow(
      row({ checkTotal: 3, checkDone: 1, dueDay: '2026-11-24', linkCount: 2, onCanvas: false }),
    )
    expect(screen.getByTestId('list-row-checklist').textContent).toBe('1/3')
    const due = screen.getByTestId('list-row-due')
    expect(due.textContent).toBe('Yesterday')
    expect(due.getAttribute('data-due')).toBe('overdue')
    expect(screen.getByTestId('list-row-links').textContent).toBe('2')
    expect(screen.getByTestId('list-row-not-on-canvas').textContent).toBe('Not on canvas')
  })

  it('opens on click, and the checkbox marks done without opening', () => {
    const a = renderRow(row())
    fireEvent.click(screen.getByTestId('list-row'))
    expect(a.open).toHaveBeenCalledWith('n1')
    fireEvent.click(screen.getByTestId('list-row-check'))
    expect(a.toggleDone).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }))
    expect(a.open).toHaveBeenCalledTimes(1)
  })

  it('shows a done row checked, with its done time and no due color', () => {
    renderRow(row({ doneAt: new Date(2026, 10, 25, 9, 5).getTime(), dueDay: '2026-11-20' }))
    expect(screen.getByTestId('list-row-check').getAttribute('data-state')).toBe('checked')
    expect(screen.getByTestId('list-row-time').textContent).toBe('09:05')
    expect(screen.getByTestId('list-row-due').getAttribute('data-due')).toBeNull()
    // A done card is hidden on the canvas, so there's nothing to fly to.
    expect(screen.queryByTestId('list-row-show')).toBeNull()
  })

  it('flies to the card from its hover button, without opening the note', () => {
    const a = renderRow(row())
    fireEvent.click(screen.getByTestId('list-row-show'))
    expect(a.showOnCanvas).toHaveBeenCalledWith('n1')
    expect(a.open).not.toHaveBeenCalled()
  })

  it('marks the keyboard-selected row', () => {
    renderRow(row(), actions(), true)
    expect(screen.getByTestId('list-row').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('list-row').hasAttribute('data-selected')).toBe(true)
  })
})
