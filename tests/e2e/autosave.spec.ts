import type { ElectronApplication } from '@playwright/test'
import { expect, relaunch, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { NotePanel } from './pages/NotePanel'

/**
 * Closes the window the way a user does (the title-bar X), which fires its `close` event, and
 * waits for the app to quit. Playwright's `app.close()` would skip the close-time save.
 */
async function closeLikeAUser(app: ElectronApplication): Promise<void> {
  const quit = app.waitForEvent('close')
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.getTitle() !== 'Sprawl quick capture')
      ?.close(),
  )
  await quit
}

test.describe('autosave (nothing is ever lost)', () => {
  test('text typed just before the window closes is there after a relaunch', async ({
    app,
    window: page,
    dirs,
    consoleProblems,
  }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Draft' }])
    await canvas.cards.first().click()
    await page.keyboard.press('Enter')
    await panel.ready()

    await panel.title.fill('Draft, renamed')
    await panel.typeLines('First line', '[] a task')
    // Still inside the 500ms debounce: nothing has been written yet.
    await expect(panel.status).toHaveAttribute('data-status', 'saving')
    const started = Date.now()
    await closeLikeAUser(app)
    // The close waits for the save, but only briefly.
    expect(Date.now() - started).toBeLessThan(1500)

    await relaunch(dirs, consoleProblems, async (_app, next) => {
      const canvas2 = new CanvasPage(next)
      await canvas2.ready()
      const card = canvas2.cards.first()
      await expect(card.getByTestId('note-card-title')).toHaveText('Draft, renamed')
      await expect(card.getByTestId('note-card-preview')).toHaveText('First line\na task')
      await expect(card.getByTestId('chip-checklist')).toHaveText('0/1')
    })
  })

  test('closing while a save is on its way still keeps the last keystrokes', async ({
    app,
    window: page,
    dirs,
    consoleProblems,
  }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Log' }])
    await canvas.cards.first().click()
    await page.keyboard.press('Enter')
    await panel.ready()

    // Type in bursts across a debounce boundary, then close mid-burst.
    await panel.typeLines('one')
    await panel.saved()
    await page.keyboard.type(' two three')
    await closeLikeAUser(app)

    await relaunch(dirs, consoleProblems, async (_app, next) => {
      const canvas2 = new CanvasPage(next)
      await canvas2.ready()
      await expect(canvas2.cards.first().getByTestId('note-card-preview')).toHaveText(
        'one two three',
      )
    })
  })
})
