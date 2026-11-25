import type { Locator, Page } from '@playwright/test'
import { expect, relaunch, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { NotePanel } from './pages/NotePanel'

/** Double-clicks a card's body, away from its title text (which would edit the title). */
async function dblclickBody(page: Page, card: Locator): Promise<void> {
  const box = await card.boundingBox()
  if (!box) throw new Error('The card is not visible')
  await page.mouse.dblclick(box.x + box.width - 40, box.y + box.height - 16)
}

/** The local day key `n` days from today, as the app computes it. */
function dayFromToday(page: Page, n: number): Promise<string> {
  return page.evaluate((days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const pad = (x: number) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, n)
}

test.describe('note panel', () => {
  test('open, edit the title and body, check a checklist, add a link, set a due date with time and reminder, change the color', async ({
    app,
    window: page,
    dirs,
    consoleProblems,
  }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Homepage redo' }])
    const card = canvas.cards.first()

    // A single click only selects; Enter opens the panel.
    await card.click()
    await expect(panel.root).toHaveCount(0)
    await page.keyboard.press('Enter')
    await panel.ready()
    await expect(panel.title).toHaveValue('Homepage redo')

    // The title updates the card as it's typed.
    await panel.title.fill('Homepage v2')
    await expect(card.getByTestId('note-card-title')).toHaveText('Homepage v2')

    // Markdown shortcuts: `[] ` makes a checklist item.
    await panel.typeLines('Hero needs a shorter line.', '[] Pick fonts', 'Ship it')
    await expect(panel.checkboxes()).toHaveCount(2)
    await panel.checkboxes().first().check()
    await expect(card.getByTestId('chip-checklist')).toHaveText('1/2')
    await expect(card.getByTestId('note-card-preview')).toContainText('Hero needs a shorter line.')

    // Links.
    await panel.addLink('github.com/sprawl')
    await expect(page.getByTestId('note-link')).toHaveAttribute(
      'data-url',
      'https://github.com/sprawl',
    )
    await expect(card.getByTestId('chip-links')).toHaveText('1')

    // Due tomorrow at 15:00, reminding an hour before.
    await page.getByTestId('note-due').click()
    await page.getByTestId('due-tomorrow').click()
    await page.getByTestId('due-add-time').click()
    await page.getByTestId('due-time-input').fill('15:00')
    await page.keyboard.press('Enter')
    await page.getByTestId('due-remind').click()
    await page.getByTestId('remind-1h').click()
    await expect(page.getByTestId('due-remind-options')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('due-picker')).toHaveCount(0)
    await expect(panel.root).toBeVisible()
    await expect(page.getByTestId('note-due-chip')).toContainText('· 15:00')
    await expect(page.getByTestId('note-reminder')).toHaveText('Reminds you tomorrow 14:00')
    await expect(card.getByTestId('chip-due')).toHaveText('Tomorrow')
    await expect(card.getByTestId('chip-due')).toHaveAttribute('data-due', 'soon')

    // Color.
    await page.getByTestId('note-color-sky').click()
    await expect(card).toHaveClass(/bg-note-sky/)

    await panel.saved()
    const tomorrow = await dayFromToday(page, 1)
    const stored = await panel.stored()
    expect(stored).toMatchObject({
      title: 'Homepage v2',
      color: 'sky',
      checkTotal: 2,
      checkDone: 1,
      dueDay: tomorrow,
      dueTime: '15:00',
      remind: '1h',
    })
    expect(stored.bodyText).toBe('Hero needs a shorter line.\nPick fonts\nShip it')
    const expected = await page.evaluate((day) => {
      const [y, m, d] = day.split('-').map(Number) as [number, number, number]
      return new Date(y, m - 1, d, 14, 0).getTime()
    }, tomorrow)
    expect(stored.remindAt).toBe(expected)
    expect(stored.links.map((l) => l.url)).toEqual(['https://github.com/sprawl'])

    // Clearing the time resets the time-based reminder.
    await page.getByTestId('note-due').click()
    await page.getByTestId('due-clear-time').click()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('note-reminder')).toHaveCount(0)
    await expect.poll(async () => (await panel.stored()).remind).toBe('none')

    // Everything is there after a relaunch.
    await panel.saved()
    await app.close()
    await relaunch(dirs, consoleProblems, async (_app, next) => {
      const canvas2 = new CanvasPage(next)
      const panel2 = new NotePanel(next)
      await canvas2.ready()
      const card2 = canvas2.cards.first()
      await expect(card2.getByTestId('chip-checklist')).toHaveText('1/2')
      await expect(card2.getByTestId('chip-links')).toHaveText('1')
      await expect(card2.getByTestId('chip-due')).toHaveText('Tomorrow')
      await card2.click()
      await next.keyboard.press('Enter')
      await panel2.ready()
      await expect(panel2.title).toHaveValue('Homepage v2')
      await expect(panel2.editor).toContainText('Hero needs a shorter line.')
      await expect(panel2.checkboxes().first()).toBeChecked()
      await expect(next.getByTestId('note-link')).toHaveCount(1)
    })
  })

  test('Esc steps back: full page → side panel → closed; Ctrl+Shift+Enter toggles full page', async ({
    window: page,
  }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Plan' }])
    await canvas.cards.first().click()
    await page.keyboard.press('Enter')
    await panel.ready()
    await expect(panel.root).toHaveAttribute('data-mode', 'side')

    await panel.body.click()
    await page.keyboard.press('Control+Shift+Enter')
    await expect(panel.root).toHaveAttribute('data-mode', 'full')
    await page.keyboard.press('Control+Shift+Enter')
    await expect(panel.root).toHaveAttribute('data-mode', 'side')
    await page.getByTestId('note-panel-full').click()
    await expect(panel.root).toHaveAttribute('data-mode', 'full')

    // Esc in the editor with the slash menu open only closes the menu.
    await panel.typeLines('/')
    await expect(page.locator('.bn-suggestion-menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.bn-suggestion-menu')).toHaveCount(0)
    await expect(panel.root).toHaveAttribute('data-mode', 'full')

    await page.keyboard.press('Escape')
    await expect(panel.root).toHaveAttribute('data-mode', 'side')
    await page.keyboard.press('Escape')
    await expect(panel.root).toHaveCount(0)
    // The card is still selected: Esc went to the panel, not the canvas.
    await expect(canvas.selected).toHaveCount(1)
  })

  test('the panel and writing in the card take turns: a note is edited in one place', async ({
    window: page,
  }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Plan' }])
    const card = canvas.cards.first()
    await card.click()
    await page.keyboard.press('Enter')
    await panel.ready()
    // Writing in the card closes the panel.
    await dblclickBody(page, card)
    await expect(card.getByTestId('note-card-editor')).toBeVisible()
    await expect(panel.root).toHaveCount(0)
    await page.keyboard.type('from the card')
    // Esc ends it; Enter opens the panel, with what was written.
    await page.keyboard.press('Escape')
    await expect(card.getByTestId('note-card-editor')).toHaveCount(0)
    await page.keyboard.press('Enter')
    await panel.ready()
    await expect(panel.editor).toContainText('from the card')
  })

  test('the menu opens a note and its due date', async ({ window: page }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Plan' }])
    await canvas.cards.first().click({ button: 'right' })
    await page.getByTestId('menu-due').click()
    await panel.ready()
    await expect(page.getByTestId('due-picker')).toBeVisible()
    await page.getByTestId('due-today').click()
    await expect(canvas.cards.first().getByTestId('chip-due')).toHaveText('Today')
    // The first Esc closes the picker; once it's gone, the next one closes the panel.
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('due-picker')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(panel.root).toHaveCount(0)

    await canvas.cards.first().click({ button: 'right' })
    await page.getByTestId('menu-open').click()
    await panel.ready()
  })

  test('a color picked in the panel is a canvas step: Ctrl+Z on the canvas undoes it', async ({
    window: page,
  }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Plan' }])
    const card = canvas.cards.first()
    await card.click()
    await page.keyboard.press('Enter')
    await panel.ready()
    await page.getByTestId('note-color-rose').click()
    await expect(card).toHaveClass(/bg-note-rose/)
    // Keys on a focused panel control aren't canvas commands.
    await page.keyboard.press('Delete')
    await page.keyboard.press('ArrowRight')
    await expect(canvas.cards).toHaveCount(1)
    expect((await canvas.stored())[0]).toMatchObject({ x: 100, y: 120 })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+z')
    await expect(card).toHaveClass(/bg-note-sand/)
    await card.click()
    await page.keyboard.press('Enter')
    await panel.ready()
    await expect(page.getByTestId('note-color-sand')).toHaveAttribute('aria-checked', 'true')
  })

  test('deleting from the panel menu closes it, and Undo brings the note back', async ({
    window: page,
  }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Plan' }])
    await canvas.cards.first().click()
    await page.keyboard.press('Enter')
    await panel.ready()
    await page.getByTestId('note-panel-menu').click()
    await page.getByTestId('note-panel-delete').click()
    await expect(panel.root).toHaveCount(0)
    await expect(canvas.cards).toHaveCount(0)
    await page.getByTestId('toast-undo').click()
    await expect(canvas.card('Plan')).toHaveCount(1)
  })

  test('the panel resizes between 320 and 720px and remembers its width', async ({
    window: page,
  }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Plan' }])
    await canvas.cards.first().click()
    await page.keyboard.press('Enter')
    await panel.ready()
    const width = async () => (await panel.root.boundingBox())?.width ?? 0
    expect(Math.round(await width())).toBe(420)

    const handle = page.getByTestId('note-panel-handle')
    const drag = async (dx: number) => {
      const box = await handle.boundingBox()
      if (!box) throw new Error('No handle')
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x + dx, y, { steps: 8 })
      await page.mouse.up()
    }
    await drag(-600)
    await expect.poll(async () => Math.round(await width())).toBe(720)
    await drag(800)
    await expect.poll(async () => Math.round(await width())).toBe(320)
    await drag(-100)
    await expect.poll(async () => Math.round(await width())).toBe(420)
    await expect.poll(() => page.evaluate(() => self.sprawl.settings.get('panelWidth'))).toBe(420)

    await drag(-80)
    await expect.poll(() => page.evaluate(() => self.sprawl.settings.get('panelWidth'))).toBe(500)
    await page.keyboard.press('Escape')
    await expect(panel.root).toHaveCount(0)
    await canvas.cards.first().click()
    await page.keyboard.press('Enter')
    await panel.ready()
    expect(Math.round(await width())).toBe(500)
  })
})
