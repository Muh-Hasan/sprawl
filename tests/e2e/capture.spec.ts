import { captureVisible, expect, openCapture, setNow, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { ListPage } from './pages/ListPage'
import { LogPage } from './pages/LogPage'

/** A local wall-clock instant in November 2026. */
const local = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime()
const TODAY = '2026-11-25' // a Wednesday

test.describe('quick capture', () => {
  test.beforeEach(async ({ app, window: page }) => {
    await new CanvasPage(page).ready()
    await setNow(app, page, local(25, 10))
  })

  test('"Call Ali !tomorrow 15:00" + Enter makes a due note on the canvas', async ({
    app,
    window: page,
    consoleProblems,
  }) => {
    const canvas = new CanvasPage(page)
    const list = new ListPage(page)
    const capture = await openCapture(app, consoleProblems)
    // The capture window follows main's clock too.
    await expect(capture.locator('html')).toHaveAttribute('data-fixed-now', String(local(25, 10)))
    const input = capture.getByTestId('capture-input')
    await expect(input).toBeFocused()
    await expect(capture.getByTestId('capture-root')).toHaveAttribute('data-mode', 'note')
    await expect(capture.getByTestId('capture-destination')).toHaveText('Save to canvas')

    await input.pressSequentially('Call Ali !tomorrow 15:00')
    await expect(capture.getByTestId('capture-token')).toHaveText('!tomorrow 15:00')
    await expect(capture.getByTestId('capture-due-chip')).toHaveText('Due Tomorrow · 15:00')
    await input.press('Enter')
    await expect(capture.getByTestId('capture-saved')).toHaveText('Saved to canvas')
    await expect.poll(() => captureVisible(app)).toBe(false)

    const [note] = await list.stored()
    expect(note).toMatchObject({
      title: 'Call Ali',
      dueDay: '2026-11-26',
      dueTime: '15:00',
      onCanvas: true,
    })
    const stored = await page.evaluate((id) => self.sprawl.notes.get(id), note!.id)
    expect(stored).toMatchObject({ remind: 'at', remindAt: local(26, 15) })
    // The main window shows it straight away (it refetched on data:changed).
    await expect(canvas.card('Call Ali')).toBeVisible()

    // Opened again, it's empty and ready for the next one.
    const again = await openCapture(app, consoleProblems)
    await expect(again.getByTestId('capture-input')).toHaveValue('')
    await expect(again.getByTestId('capture-input')).toBeFocused()
  })

  test('Shift+Enter adds a line (the body); a ! that is not a date stays', async ({
    app,
    window: page,
    consoleProblems,
  }) => {
    const capture = await openCapture(app, consoleProblems)
    const input = capture.getByTestId('capture-input')
    await input.pressSequentially('Wow! Ideas')
    await expect(capture.getByTestId('capture-due-chip')).toHaveCount(0)
    await input.press('Shift+Enter')
    await input.pressSequentially('one more line')
    await input.press('Enter')
    await expect.poll(() => captureVisible(app)).toBe(false)
    const [row] = await new ListPage(page).stored()
    expect(row).toMatchObject({ title: 'Wow! Ideas', firstLine: 'one more line', dueDay: null })
  })

  test("Log mode (Tab) adds a line to today's log", async ({
    app,
    window: page,
    consoleProblems,
  }) => {
    const capture = await openCapture(app, consoleProblems)
    const input = capture.getByTestId('capture-input')
    await input.press('Tab')
    await expect(capture.getByTestId('capture-root')).toHaveAttribute('data-mode', 'log')
    await expect(capture.getByTestId('capture-destination')).toHaveText('Add to today’s log')
    await expect(input).toHaveAttribute('placeholder', 'What did you just do?')
    await input.pressSequentially('Called the bank !fri')
    await expect(capture.getByTestId('capture-due-chip')).toHaveCount(0)
    await input.press('Enter')
    await expect(capture.getByTestId('capture-saved')).toHaveText('Logged')
    await expect.poll(() => captureVisible(app)).toBe(false)

    const log = new LogPage(page)
    expect((await log.stored(TODAY)).entries).toMatchObject([
      { kind: 'manual', text: 'Called the bank !fri', at: local(25, 10) },
    ])
    expect(await new ListPage(page).stored()).toEqual([])
    // The log view, if open, shows it.
    await log.open()
    await expect(log.entry('Called the bank !fri')).toBeVisible()
  })

  test('Esc with text clears it without saving; Esc again closes', async ({
    app,
    window: page,
    consoleProblems,
  }) => {
    const capture = await openCapture(app, consoleProblems)
    const input = capture.getByTestId('capture-input')
    await input.pressSequentially('Never mind')
    await input.press('Escape')
    await expect(input).toHaveValue('')
    expect(await captureVisible(app)).toBe(true)
    await input.press('Escape')
    await expect.poll(() => captureVisible(app)).toBe(false)
    expect(await new ListPage(page).stored()).toEqual([])
    // Enter on nothing saves nothing either.
    const again = await openCapture(app, consoleProblems)
    await again.getByTestId('capture-input').press('Enter')
    expect(await captureVisible(app)).toBe(true)
    expect(await new ListPage(page).stored()).toEqual([])
  })

  test('the save button names the destination and saves on click', async ({
    app,
    window: page,
    consoleProblems,
  }) => {
    const capture = await openCapture(app, consoleProblems)
    const save = capture.getByTestId('capture-destination')
    // Nothing to save yet.
    await expect(save).toBeDisabled()
    await capture.getByTestId('capture-input').pressSequentially('Clicked into place')
    await expect(save).toBeEnabled()
    await save.click()
    await expect(capture.getByTestId('capture-saved')).toHaveText('Saved to canvas')
    await expect.poll(() => captureVisible(app)).toBe(false)
    const [row] = await new ListPage(page).stored()
    expect(row).toMatchObject({ title: 'Clicked into place', onCanvas: true })
  })

  test('a capture lands in the middle of the view, and the next fans out instead of stacking', async ({
    app,
    window: page,
    consoleProblems,
  }) => {
    const canvas = new CanvasPage(page)
    for (const title of ['One', 'Two']) {
      const capture = await openCapture(app, consoleProblems)
      await capture.getByTestId('capture-input').pressSequentially(title)
      await capture.getByTestId('capture-input').press('Enter')
      await expect.poll(() => captureVisible(app)).toBe(false)
    }
    await expect(canvas.cards).toHaveCount(2)
    const [one, two] = await Promise.all([
      canvas.card('One').boundingBox(),
      canvas.card('Two').boundingBox(),
    ])
    expect(Math.round(two!.x - one!.x)).toBe(40)
    expect(Math.round(two!.y - one!.y)).toBe(40)
    const view = await canvas.root.boundingBox()
    expect(Math.abs(one!.x + one!.width / 2 - (view!.x + view!.width / 2))).toBeLessThan(12)
  })

  test('the default mode comes from Settings', async ({ app, window: page, consoleProblems }) => {
    await page.getByTestId('sidebar-settings').click()
    await page.getByTestId('settings-capture-mode-log').click()
    await expect(page.getByTestId('settings-capture-mode-log')).toHaveAttribute('data-state', 'on')
    await expect
      .poll(() => page.evaluate(() => self.sprawl.settings.get('captureDefaultMode')))
      .toBe('log')
    const capture = await openCapture(app, consoleProblems)
    await expect(capture.getByTestId('capture-root')).toHaveAttribute('data-mode', 'log')
  })
})
