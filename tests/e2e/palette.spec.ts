import type { ElectronApplication } from '@playwright/test'
import { expect, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { ListPage } from './pages/ListPage'
import { NotePanel } from './pages/NotePanel'
import { Palette } from './pages/Palette'

/** The main window's zoom factor (the app text size). */
const zoomFactor = (app: ElectronApplication): Promise<number | undefined> =>
  app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => !w.webContents.getURL().endsWith('capture.html'))
      ?.webContents.getZoomFactor(),
  )

test.describe('command palette', () => {
  test.beforeEach(async ({ window: page }) => {
    await new CanvasPage(page).ready()
  })

  test('finds a note by title; Enter opens it and glides the canvas to its card', async ({
    window: page,
  }) => {
    const palette = new Palette(page)
    const list = new ListPage(page)
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await list.seed([
      { id: 'far', title: 'Far away', color: 'sky', card: { x: 4000, y: 3000 } },
      { id: 'near', title: 'Groceries', card: { x: 0, y: 0 } },
      { id: 'loose', title: 'Far too loose' },
    ])
    // From the list, so the canvas loads the seeded cards when it opens again.
    await list.open()

    await palette.open()
    // With no query: the notes edited last, then every command.
    await expect(palette.notes).toHaveCount(3)
    await expect(palette.command('new-note')).toBeVisible()

    await palette.input.fill('far')
    await expect(palette.notes).toHaveCount(2)
    await expect(palette.commands).toHaveCount(0)
    await expect(palette.note('loose')).toContainText('List')
    await expect(palette.note('far')).toContainText('Canvas')
    // The first result starts highlighted; ↓ moves and ↑ comes back.
    await expect(palette.selected).toHaveAttribute('data-testid', 'palette-note-loose')
    await page.keyboard.press('ArrowDown')
    await expect(palette.selected).toHaveAttribute('data-testid', 'palette-note-far')
    await page.keyboard.press('ArrowUp')
    await expect(palette.selected).toHaveAttribute('data-testid', 'palette-note-loose')

    await palette.input.fill('far away')
    await expect(palette.selected).toHaveAttribute('data-testid', 'palette-note-far')
    await page.keyboard.press('Enter')
    await expect(palette.root).toBeHidden()

    await panel.ready()
    expect(await panel.noteId()).toBe('far')
    await canvas.ready()
    await expect(canvas.card('Far away')).toHaveAttribute('data-selected', /.*/)
    // The card ends up in the middle of the canvas the panel leaves.
    await expect
      .poll(async () => {
        const [card, view] = await Promise.all([
          canvas.card('Far away').boundingBox(),
          canvas.root.boundingBox(),
        ])
        if (!card || !view) return Infinity
        const dx = card.x + card.width / 2 - (view.x + view.width / 2)
        const dy = card.y + card.height / 2 - (view.y + view.height / 2)
        return Math.round(Math.hypot(dx, dy))
      })
      .toBeLessThan(40)

    // Ctrl+K works from inside the note editor too, closes the palette again, and typing goes
    // on in the editor.
    await panel.body.click()
    await palette.open()
    await page.keyboard.press('Control+KeyK')
    await expect(palette.root).toBeHidden()
    await expect(panel.body).toBeFocused()
  })

  test('> lists commands only, and they run', async ({ app, window: page }) => {
    const palette = new Palette(page)
    const list = new ListPage(page)
    await list.seed([{ id: 'a', title: 'Go to the gym', card: { x: 0, y: 0 } }])

    await palette.open()
    await palette.input.fill('>')
    await expect(palette.notes).toHaveCount(0)
    await expect(palette.command('settings')).toBeVisible()
    await palette.input.fill('> nothing like this')
    await expect(palette.empty).toHaveText('No commands match.')
    await page.keyboard.press('Escape')
    await expect(palette.root).toBeHidden()

    await palette.run('>go list', 'palette-command-go-list')
    await expect(list.root).toBeVisible()
    await palette.run('>daily log', 'palette-command-go-log')
    await expect(page.getByTestId('view-log')).toBeVisible()
    await palette.run('>settings', 'palette-command-settings')
    await expect(page.getByTestId('view-settings')).toBeVisible()

    await palette.run('>text big', 'palette-command-text-bigger')
    await expect.poll(() => zoomFactor(app)).toBe(1.1)
    await palette.run('>reset text', 'palette-command-text-reset')
    await expect.poll(() => zoomFactor(app)).toBe(1)

    await palette.run('>show done', 'palette-command-show-done')
    await expect.poll(() => page.evaluate(() => self.sprawl.settings.get('showDone'))).toBe(true)
    await palette.open()
    await palette.input.fill('>done')
    await expect(palette.command('show-done')).toHaveText(/Hide done notes/)
    await page.keyboard.press('Escape')

    // Zoom to fit goes back to the canvas first.
    await palette.run('>zoom fit', 'palette-command-zoom-fit')
    await new CanvasPage(page).ready()
  })

  test('New note, a note named by the query, and the sidebar search box', async ({
    window: page,
  }) => {
    const palette = new Palette(page)
    const canvas = new CanvasPage(page)
    const before = await canvas.cards.count()

    // New note puts a card in the middle of the view, ready to type in.
    await palette.run('new note', 'palette-command-new-note')
    await expect(canvas.cards).toHaveCount(before + 1)
    await expect(canvas.titleInput).toBeFocused()
    await page.keyboard.type('Typed straight away')
    await page.keyboard.press('Enter')
    await expect(canvas.card('Typed straight away')).toBeVisible()

    // Nothing matches: Enter makes a note with that title.
    await page.getByTestId('sidebar-search').click()
    await expect(palette.input).toBeFocused()
    await palette.input.fill('Call the dentist')
    await expect(palette.empty).toContainText('create a note called “Call the dentist”')
    await page.keyboard.press('Enter')
    await expect(palette.root).toBeHidden()
    await expect(canvas.card('Call the dentist')).toBeVisible()

    // Esc closes it and gives focus back to what opened it.
    await page.getByTestId('sidebar-search').click()
    await expect(palette.input).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(palette.root).toBeHidden()
    await expect(page.getByTestId('sidebar-search')).toBeFocused()
  })
})
