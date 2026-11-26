import type { Locator, Page } from '@playwright/test'
import { expect, relaunch, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'

/** Double-clicks a card's body, away from its title text. */
async function dblclickBody(page: Page, card: Locator): Promise<void> {
  const box = await card.boundingBox()
  if (!box) throw new Error('The card is not visible')
  await page.mouse.dblclick(box.x + box.width - 40, box.y + box.height - 16)
}

test.describe('writing in a card', () => {
  test('double-click the body, write plain text and [] to-dos, Esc: the card shows it and it survives a relaunch', async ({
    app,
    window: page,
    dirs,
    consoleProblems,
  }) => {
    const canvas = new CanvasPage(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Groceries' }])
    const card = canvas.cards.first()

    await dblclickBody(page, card)
    const editor = card.getByTestId('note-card-editor')
    await expect(editor).toBeVisible()
    // The cursor is already in the body. Markdown stays text in a card, except `[] `.
    await page.keyboard.type('# Today')
    await page.keyboard.press('Enter')
    await page.keyboard.type('- soon')
    await page.keyboard.press('Enter')
    await page.keyboard.type('[] eggs')
    await page.keyboard.press('Enter')
    await page.keyboard.type('milk')
    await expect(editor.locator('[data-content-type="heading"]')).toHaveCount(0)
    await expect(editor.locator('[data-content-type="bulletListItem"]')).toHaveCount(0)
    await expect(editor.locator('[data-content-type="checkListItem"]')).toHaveCount(2)

    // Single-key tools and Delete are text while writing.
    await page.keyboard.type(' vhn')
    await page.keyboard.press('Backspace')
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.cards).toHaveCount(1)

    await editor.locator('input[type="checkbox"]').first().check()
    await expect(card.getByTestId('chip-checklist')).toHaveText('1/2')

    await page.keyboard.press('Escape')
    await expect(editor).toHaveCount(0)
    await expect(card.getByTestId('note-card-preview')).toHaveText('# Today\n- soon\neggs\nmilk vh')
    await expect
      .poll(async () => (await canvas.stored())[0]?.note)
      .toMatchObject({ checkTotal: 2, checkDone: 1, preview: '# Today\n- soon\neggs\nmilk vh' })

    await app.close()
    await relaunch(dirs, consoleProblems, async (_app, next) => {
      const again = new CanvasPage(next)
      await again.ready()
      const card2 = again.cards.first()
      await expect(card2.getByTestId('note-card-preview')).toHaveText(
        '# Today\n- soon\neggs\nmilk vh',
      )
      await dblclickBody(next, card2)
      await expect(card2.locator('input[type="checkbox"]').first()).toBeChecked()
    })
  })

  test('a new sticky is title, Enter, write; clicking away ends it', async ({ window: page }) => {
    const canvas = new CanvasPage(page)
    await canvas.ready()
    const c = await canvas.center()
    await page.mouse.dblclick(c.x - 200, c.y - 100)
    await expect(canvas.titleInput).toBeFocused()
    await page.keyboard.type('Call Ali')
    await page.keyboard.press('Enter')
    const card = canvas.card('Call Ali')
    await expect(card.getByTestId('note-card-editor')).toBeVisible()
    await page.keyboard.type('about the venue')
    await canvas.root.click({ position: { x: 60, y: 600 } })
    await expect(card.getByTestId('note-card-editor')).toHaveCount(0)
    await expect(card.getByTestId('note-card-preview')).toHaveText('about the venue')
  })

  test('a card has no menus, and pasted markdown stays text', async ({ app, window: page }) => {
    const canvas = new CanvasPage(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Plan' }])
    const card = canvas.cards.first()
    await dblclickBody(page, card)
    const editor = card.getByTestId('note-card-editor')
    await expect(editor).toBeVisible()
    await page.keyboard.type('/')
    await expect(page.locator('.bn-suggestion-menu')).toHaveCount(0)
    await page.keyboard.press('Backspace')
    await app.evaluate(({ clipboard }) => clipboard.writeText('# Big\n- item'))
    await page.keyboard.press('Control+v')
    await expect(editor).toContainText('# Big')
    await expect(editor.locator('[data-content-type="heading"]')).toHaveCount(0)
  })

  test('a heading made in the panel stays quiet in the card', async ({ window: page }) => {
    const canvas = new CanvasPage(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Plan' }])
    const card = canvas.cards.first()
    await card.click()
    await page.keyboard.press('Enter')
    const body = page.getByTestId('note-editor').locator('[contenteditable="true"]')
    await body.click()
    await page.keyboard.type('# Section')
    await expect(
      page.getByTestId('note-editor').locator('[data-content-type="heading"]'),
    ).toHaveText('Section')
    await page.keyboard.press('Escape') // leaves the editor
    await page.keyboard.press('Escape') // closes the panel
    await dblclickBody(page, card)
    const heading = card.getByTestId('note-card-editor').locator('[data-content-type="heading"]')
    await expect(heading).toHaveText('Section')
    // Card-sized: the same 13px as the rest of the card's text.
    expect(
      await heading.evaluate(
        (el) => getComputedStyle(el.querySelector('.bn-inline-content')!).fontSize,
      ),
    ).toBe('13px')
  })
})
