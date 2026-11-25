import { expect, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'

test.describe('canvas selection', () => {
  let canvas: CanvasPage
  test.beforeEach(async ({ window }) => {
    canvas = new CanvasPage(window)
    await canvas.ready()
    await canvas.seed([
      { key: 'a', x: 300, y: 200 },
      { key: 'b', x: 600, y: 200 },
      { key: 'c', x: 300, y: 400 },
      { key: 'd', x: 900, y: 500 },
    ])
  })

  test('marquee selects 3 of 4 notes; Ctrl+D duplicates them; undo removes the duplicates', async ({
    window,
  }) => {
    await canvas.dragBetween(await canvas.pagePoint(260, 160), await canvas.pagePoint(860, 480))
    await expect(canvas.selected).toHaveCount(3)
    await expect(canvas.card('Card d')).not.toHaveAttribute('data-selected')

    await window.keyboard.press('Control+KeyD')
    await expect(canvas.cards).toHaveCount(7)
    await expect(window.getByText('Duplicated')).toBeVisible()
    // The copies are selected, 24px down and right, each with a note of its own.
    await expect(canvas.selected).toHaveCount(3)
    await expect(canvas.card('Card a')).toHaveCount(2)
    const stored = await canvas.stored()
    const copies = stored.filter((i) => !i.id.startsWith('c-'))
    expect(copies.map((c) => [c.x, c.y]).sort()).toEqual([
      [324, 224],
      [324, 424],
      [624, 224],
    ])
    expect(new Set(stored.map((i) => i.refId)).size).toBe(7)

    await window.keyboard.press('Control+KeyZ')
    await expect(canvas.cards).toHaveCount(4)
    await expect.poll(async () => (await canvas.stored()).length).toBe(4)
  })

  test('click, Shift+click, Ctrl+A and Esc', async ({ window }) => {
    await canvas.card('Card a').click()
    await expect(canvas.selected).toHaveCount(1)
    await canvas.card('Card b').click({ modifiers: ['Shift'] })
    await expect(canvas.selected).toHaveCount(2)
    await canvas.card('Card a').click({ modifiers: ['Shift'] })
    await expect(canvas.selected).toHaveCount(1)
    await expect(canvas.card('Card b')).toHaveAttribute('data-selected', 'true')

    await window.keyboard.press('Control+KeyA')
    await expect(canvas.selected).toHaveCount(4)
    // Dragging one card of a selection moves them all by the same (snapped) delta, in one
    // undo step: the grabbed card lands on the grid (300 + 40 → 344), the rest keep their spacing.
    await canvas.dragCard(canvas.card('Card c'), 40, 0)
    await expect
      .poll(async () => (await canvas.stored()).map((i) => i.x).sort((p, q) => p - q))
      .toEqual([344, 344, 644, 944])
    await window.keyboard.press('Control+KeyZ')
    await expect
      .poll(async () => (await canvas.stored()).map((i) => i.x).sort((p, q) => p - q))
      .toEqual([300, 300, 600, 900])

    await window.keyboard.press('Escape')
    await expect(canvas.selected).toHaveCount(0)

    // A click on empty space clears the selection too.
    await canvas.card('Card d').click()
    await canvas.root.click({ position: { x: 40, y: 600 } })
    await expect(canvas.selected).toHaveCount(0)
  })

  test("single-key tools don't fire while typing a title", async ({ window }) => {
    await canvas.card('Card a').getByTestId('note-card-title').dblclick()
    await expect(canvas.titleInput).toBeFocused()
    await window.keyboard.type('nhv')
    await expect(window.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true')
    await window.keyboard.press('Backspace') // deletes text, not the card
    await window.keyboard.press('Enter')
    await expect(canvas.cards).toHaveCount(4)
    await expect(canvas.card('nh')).toBeVisible()
  })
})
