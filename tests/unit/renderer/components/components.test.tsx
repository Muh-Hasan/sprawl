// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ColorSwatches } from '../../../../src/renderer/components/ColorSwatches'
import { DuePicker } from '../../../../src/renderer/components/DuePicker'
import { TooltipProvider } from '../../../../src/renderer/components/ui/tooltip'
import { useClockStore } from '../../../../src/renderer/stores/clockStore'
import { CardChips } from '../../../../src/renderer/views/canvas/items/CardChips'
import type { DueFields } from '../../../../src/shared/due'
import { cardNote } from '../../helpers/cardNote'

// Radix needs a few browser APIs jsdom doesn't have.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
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

describe('CardChips', () => {
  it('shows nothing for a note with nothing to show', () => {
    const { container } = render(<CardChips note={cardNote()} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows checklist progress, links, attachments and the due day', () => {
    act(() => useClockStore.setState({ now: NOW }))
    render(
      <CardChips
        note={cardNote({
          checkTotal: 5,
          checkDone: 2,
          linkCount: 3,
          attachCount: 1,
          dueDay: '2026-11-26',
        })}
      />,
    )
    expect(screen.getByTestId('chip-checklist').textContent).toBe('2/5')
    expect(screen.getByTestId('chip-links').textContent).toBe('3')
    expect(screen.getByTestId('chip-attachments').textContent).toBe('1')
    const due = screen.getByTestId('chip-due')
    expect(due.textContent).toBe('Tomorrow')
    expect(due.dataset['due']).toBe('soon')
  })

  it('hides the zero chips and styles the due chip by state', () => {
    act(() => useClockStore.setState({ now: NOW }))
    const { rerender } = render(<CardChips note={cardNote({ dueDay: '2026-11-24' })} />)
    expect(screen.queryByTestId('chip-checklist')).toBeNull()
    expect(screen.queryByTestId('chip-links')).toBeNull()
    expect(screen.getByTestId('chip-due').dataset['due']).toBe('overdue')
    rerender(<CardChips note={cardNote({ dueDay: '2026-12-12' })} />)
    expect(screen.getByTestId('chip-due').dataset['due']).toBe('later')
    expect(screen.getByTestId('chip-due').textContent).toBe('12 Dec')
  })

  it('follows the shared clock across midnight', () => {
    act(() => useClockStore.setState({ now: new Date(2026, 10, 25, 23, 59).getTime() }))
    render(<CardChips note={cardNote({ dueDay: '2026-11-25' })} />)
    expect(screen.getByTestId('chip-due').dataset['due']).toBe('soon')
    act(() => useClockStore.setState({ now: new Date(2026, 10, 26, 0, 0).getTime() }))
    expect(screen.getByTestId('chip-due').dataset['due']).toBe('overdue')
    expect(screen.getByTestId('chip-due').textContent).toBe('Yesterday')
  })
})

describe('ColorSwatches', () => {
  it('marks the current color and reports a pick', () => {
    const onChange = vi.fn()
    render(
      <TooltipProvider>
        <ColorSwatches value="sand" onChange={onChange} />
      </TooltipProvider>,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(6)
    expect(screen.getByTestId('color-sand').getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('color-sky').getAttribute('aria-checked')).toBe('false')
    fireEvent.click(screen.getByTestId('color-sky'))
    expect(onChange).toHaveBeenCalledWith('sky')
  })
})

describe('DuePicker', () => {
  const renderPicker = (value: DueFields, onChange = vi.fn()) => {
    render(
      <DuePicker value={value} onChange={onChange} open onOpenChange={() => {}} now={() => NOW}>
        <button>trigger</button>
      </DuePicker>,
    )
    return onChange
  }
  const empty: DueFields = { dueDay: null, dueTime: null, remind: 'none' }

  it('quick picks set the day; Clear clears everything', () => {
    const onChange = renderPicker({ dueDay: '2026-11-30', dueTime: '10:00', remind: 'at' })
    fireEvent.click(screen.getByTestId('due-today'))
    expect(onChange).toHaveBeenLastCalledWith({ dueDay: '2026-11-25' })
    fireEvent.click(screen.getByTestId('due-tomorrow'))
    expect(onChange).toHaveBeenLastCalledWith({ dueDay: '2026-11-26' })
    fireEvent.click(screen.getByTestId('due-next-week'))
    expect(onChange).toHaveBeenLastCalledWith({ dueDay: '2026-11-30' })
    fireEvent.click(screen.getByTestId('due-clear'))
    expect(onChange).toHaveBeenLastCalledWith({ dueDay: null, dueTime: null, remind: 'none' })
  })

  it('picks a day in the calendar', () => {
    const onChange = renderPicker(empty)
    // The grid also shows the end of October; pick the November day by its label.
    const calendar = screen.getByTestId('due-picker')
    fireEvent.click(within(calendar).getByRole('button', { name: /November 27/ }))
    expect(onChange).toHaveBeenLastCalledWith({ dueDay: '2026-11-27' })
  })

  it('needs a day before a time or reminder', () => {
    renderPicker(empty)
    expect(screen.getByTestId('due-add-time')).toHaveProperty('disabled', true)
    expect(screen.getByTestId('due-remind')).toHaveProperty('disabled', true)
  })

  it('adds a time, types one, steps it with the arrows and clears it', () => {
    const onChange = renderPicker({ dueDay: '2026-11-26', dueTime: null, remind: 'none' })
    fireEvent.click(screen.getByTestId('due-add-time'))
    expect(onChange).toHaveBeenLastCalledWith({ dueTime: '09:00' })
    cleanup()

    const onTime = renderPicker({ dueDay: '2026-11-26', dueTime: '09:00', remind: 'none' })
    const input = screen.getByTestId('due-time-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '1530' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onTime).toHaveBeenLastCalledWith({ dueTime: '15:30' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('15:45')
    fireEvent.blur(input)
    expect(onTime).toHaveBeenLastCalledWith({ dueTime: '15:45' })
    fireEvent.change(input, { target: { value: 'soon' } })
    fireEvent.blur(input)
    expect(input.value).toBe('09:00')
    fireEvent.click(screen.getByTestId('due-clear-time'))
    expect(onTime).toHaveBeenLastCalledWith({ dueTime: null })
  })

  it('disables the reminders that need a time until there is one', () => {
    renderPicker({ dueDay: '2026-11-26', dueTime: null, remind: 'none' })
    fireEvent.click(screen.getByTestId('due-remind'))
    for (const option of ['at', '15m', '1h'])
      expect(screen.getByTestId(`remind-${option}`).dataset['disabled']).toBe('')
    for (const option of ['none', 'morning', '1d'])
      expect(screen.getByTestId(`remind-${option}`).dataset['disabled']).toBeUndefined()
  })

  it('offers every reminder with a time, and reports the choice', () => {
    const onChange = renderPicker({ dueDay: '2026-11-26', dueTime: '15:00', remind: 'none' })
    fireEvent.click(screen.getByTestId('due-remind'))
    expect(screen.getByTestId('remind-15m').dataset['disabled']).toBeUndefined()
    fireEvent.click(screen.getByTestId('remind-15m'))
    expect(onChange).toHaveBeenLastCalledWith({ remind: '15m' })
  })
})
