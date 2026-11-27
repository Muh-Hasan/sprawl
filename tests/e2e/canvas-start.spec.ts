import { expect, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { ListPage } from './pages/ListPage'

test.describe('starting on an empty canvas', () => {
  let canvas: CanvasPage
  test.beforeEach(async ({ window }) => {
    canvas = new CanvasPage(window)
    await canvas.ready()
  })

  test('an empty canvas explains how to start and offers the start tiles', async ({ window }) => {
    const empty = window.getByTestId('canvas-empty')
    await expect(empty).toBeVisible()
    await expect(empty).toContainText('Your canvas is empty')
    await expect(window.getByTestId('canvas-empty-capture')).toContainText('Ctrl Shift Space')
    await expect(window.getByTestId('status-pill')).toContainText('Nothing done yet')

    await window.getByTestId('start-new-note').click()
    await expect(canvas.cards).toHaveCount(1)
    await expect(canvas.titleInput).toBeFocused()
    await expect(empty).toBeHidden()
  })

  test('double-clicking beside the tiles still makes a note there', async ({ window }) => {
    const at = await canvas.pagePoint(120, 120)
    await window.mouse.dblclick(at.x, at.y)
    await expect(canvas.cards).toHaveCount(1)
    await expect(window.getByTestId('canvas-empty')).toBeHidden()
  })

  test('Paste a list turns the clipboard into a note', async ({ app, window }) => {
    await app.evaluate(({ clipboard }) => clipboard.writeText(''))
    await window.getByTestId('start-paste').click()
    await expect(window.getByText('Copy some text first, then paste it here')).toBeVisible()
    await expect(canvas.cards).toHaveCount(0)

    await app.evaluate(({ clipboard }) => clipboard.writeText('Groceries\neggs\nmilk'))
    await window.getByTestId('start-paste').click()
    await expect(canvas.card('Groceries')).toBeVisible()
  })

  test('the welcome board places five sample notes, and one undo takes them away', async ({
    window,
  }) => {
    await window.getByTestId('start-welcome-board').click()
    await expect(canvas.cards).toHaveCount(5)
    for (const title of [
      'Drag me around',
      'Open a note',
      'Give it a due date',
      'Tick it off',
      'Find anything',
    ]) {
      await expect(canvas.card(title)).toBeVisible()
    }
    await expect.poll(async () => (await canvas.stored()).length).toBe(5)
    const colors = await new ListPage(window).stored()
    expect(new Set(colors.map((n) => n.color)).size).toBe(5)

    await window.keyboard.press('Control+z')
    await expect(canvas.cards).toHaveCount(0)
    await expect(window.getByTestId('canvas-empty')).toBeVisible()
  })
})

test.describe('the canvas toolbar', () => {
  test('sits at the bottom center with every tool, and the unbuilt ones say they are coming', async ({
    window,
  }) => {
    const canvas = new CanvasPage(window)
    await canvas.ready()
    const toolbar = window.getByTestId('canvas-toolbar')
    const tools = toolbar.locator('[data-testid^="tool-"]:not([data-testid$="-dot"])')
    await expect(tools).toHaveCount(6)
    expect(await tools.evaluateAll((els) => els.map((el) => el.dataset.testid))).toEqual([
      'tool-select',
      'tool-hand',
      'tool-note',
      'tool-drawing',
      'tool-image',
      'tool-link',
    ])

    const box = (await canvas.root.boundingBox())!
    const bar = (await toolbar.boundingBox())!
    expect(Math.abs(bar.x + bar.width / 2 - (box.x + box.width / 2))).toBeLessThan(2)
    expect(Math.round(box.y + box.height - (bar.y + bar.height))).toBe(20)
    expect(Math.round(bar.height)).toBe(58) // 44px buttons, 6px padding, 1px border

    await expect(window.getByTestId('tool-note-dot')).toBeVisible()
    await expect(window.getByTestId('tool-image')).toHaveAttribute('aria-disabled', 'true')
    // A stepped move, as a real pointer makes: Radix keeps a tooltip open across a single jump.
    const hover = async (testId: string): Promise<void> => {
      const b = (await window.getByTestId(testId).boundingBox())!
      await window.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 })
    }
    await hover('tool-image')
    await expect(
      window.getByRole('tooltip').filter({ hasText: 'Image · coming soon' }),
    ).toBeVisible()
    await hover('tool-note')
    await expect(window.getByRole('tooltip').filter({ hasText: 'Sticky noteN' })).toBeVisible()
  })
})
