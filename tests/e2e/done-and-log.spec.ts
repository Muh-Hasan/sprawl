import type { Page } from '@playwright/test'
import { expect, relaunch, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { LogPage } from './pages/LogPage'
import { NotePanel } from './pages/NotePanel'

/** Today's local day key, as the app computes it. */
function today(page: Page): Promise<string> {
  return page.evaluate(() => {
    const d = new Date()
    const pad = (x: number) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
}

/** "HH:mm" of an instant, in local time. */
const hhmm = (ms: number): string => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

test.describe('done and the daily log', () => {
  test("mark done → the card fades off → today's log has it with the time → undo removes it", async ({
    window: page,
  }) => {
    const canvas = new CanvasPage(page)
    const log = new LogPage(page)
    await canvas.ready()
    await canvas.seed([
      { key: 'a', x: 100, y: 120, title: 'Call the bank' },
      { key: 'b', x: 400, y: 120, title: 'Buy milk' },
    ])
    const day = await today(page)
    await expect(page.getByTestId('status-pill')).toContainText('Nothing done yet')

    // One click on the hover check.
    const card = canvas.card('Call the bank')
    await card.hover()
    await card.getByTestId('note-card-done').click()
    await expect(canvas.card('Call the bank')).toHaveCount(0)
    await expect(canvas.cards).toHaveCount(1)
    await expect(page.getByText('Marked done', { exact: true })).toBeVisible()
    await expect(page.getByTestId('status-pill')).toContainText('1 done today')

    // Stored: done_at plus one done entry with the title, at that time.
    const stored = await log.stored(day)
    expect(stored.entries).toHaveLength(1)
    const entry = stored.entries[0]!
    expect(entry).toMatchObject({ kind: 'done', text: 'Call the bank', noteId: 'n-a' })
    const note = await page.evaluate(() => self.sprawl.notes.get('n-a'))
    expect(note.doneAt).toBe(entry.at)

    // The status pill opens today's log.
    await page.getByTestId('status-pill').click()
    await log.showing(day)
    await expect(page.getByTestId('log-today-tag')).toBeVisible()
    await expect(log.entries).toHaveCount(1)
    await expect(log.entry('Call the bank').getByTestId('log-entry-time')).toHaveText(
      hhmm(entry.at),
    )
    await expect(log.entry('Call the bank').getByTestId('log-entry-color')).toHaveText('sand')
    await expect(log.summary).toHaveText('1 done · 0 logged')

    // Undo on the canvas takes it all back: no entry, no done_at.
    await page.getByTestId('sidebar-canvas').click()
    await canvas.ready()
    await page.keyboard.press('Control+z')
    await expect(canvas.card('Call the bank')).toBeVisible()
    await expect(page.getByTestId('status-pill')).toContainText('Nothing done yet')
    expect((await log.stored(day)).entries).toEqual([])
    expect((await page.evaluate(() => self.sprawl.notes.get('n-a'))).doneAt).toBeNull()
    await log.open()
    await expect(log.empty).toBeVisible()
    await expect(log.summary).toHaveText('0 done · 0 logged')
  })

  test('mark done from the menu, Ctrl+Enter and the panel footer; Show done; the toast Undo', async ({
    window: page,
  }) => {
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.ready()
    await canvas.seed([
      { key: 'a', x: 100, y: 120, title: 'Menu' },
      { key: 'b', x: 400, y: 120, title: 'Keys' },
      { key: 'c', x: 700, y: 120, title: 'Panel' },
    ])

    // The context menu.
    await canvas.card('Menu').click({ button: 'right' })
    await page.getByTestId('menu-done').click()
    await expect(canvas.card('Menu')).toHaveCount(0)

    // The toast's Undo brings it back.
    await page.getByTestId('toast-undo').click()
    await expect(canvas.card('Menu')).toBeVisible()
    await expect(canvas.card('Menu')).not.toHaveAttribute('data-done')

    // Ctrl+Enter on the selection.
    await canvas.card('Keys').click()
    await page.keyboard.press('Control+Enter')
    await expect(canvas.card('Keys')).toHaveCount(0)

    // The panel footer: Mark done, then "Done · HH:mm · Undo".
    await canvas.card('Panel').click()
    await page.keyboard.press('Enter')
    await panel.ready()
    await page.getByTestId('note-panel-mark-done').click()
    await expect(page.getByTestId('note-panel-done')).toHaveText(/^Done · \d\d:\d\d$/)
    await expect(canvas.card('Panel')).toHaveCount(0)
    await page.getByTestId('note-panel-undo-done').click()
    await expect(page.getByTestId('note-panel-mark-done')).toBeVisible()
    await expect(canvas.card('Panel')).toBeVisible()

    // Ctrl+Enter inside the panel.
    await panel.title.click()
    await page.keyboard.press('Control+Enter')
    await expect(page.getByTestId('note-panel-done')).toBeVisible()
    await expect(canvas.card('Panel')).toHaveCount(0)
    expect((await panel.stored()).doneAt).not.toBeNull()
    await page.keyboard.press('Escape')
    await expect(panel.root).toHaveCount(0)

    // Show done: done cards come back faded and struck through, and can be undone from there.
    const toggle = page.getByTestId('show-done-toggle')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.cards).toHaveCount(3)
    const keys = canvas.card('Keys')
    await expect(keys).toHaveAttribute('data-done', 'true')
    await expect(keys.getByTestId('note-card-title')).toHaveCSS(
      'text-decoration-line',
      'line-through',
    )
    await keys.hover()
    await keys.getByTestId('note-card-done').click()
    await expect(keys).not.toHaveAttribute('data-done')
    expect(await page.evaluate(() => self.sprawl.settings.get('showDone'))).toBe(true)

    await toggle.click()
    await expect(canvas.cards).toHaveCount(2)
    await expect(canvas.card('Panel')).toHaveCount(0)
  })

  test('a manual entry: add, edit the time and text, delete with undo; navigating days', async ({
    app,
    window: page,
    dirs,
    consoleProblems,
  }) => {
    const log = new LogPage(page)
    const day = await today(page)
    await log.open()
    await log.showing(day)
    await expect(log.empty).toBeVisible()

    await log.add('Called the bank')
    await expect(log.entries).toHaveCount(1)
    await expect(log.entry('Called the bank')).toHaveAttribute('data-kind', 'manual')
    await expect(log.summary).toHaveText('0 done · 1 logged')
    await log.add('Paid **rent**')
    await expect(log.entries).toHaveCount(2)
    await expect(log.entries.nth(1).getByTestId('log-entry-text').locator('strong')).toHaveText(
      'rent',
    )

    // Edit the first entry's time: it moves after the other one if later.
    const first = log.entry('Called the bank')
    await first.getByTestId('log-entry-time').click()
    await page.getByTestId('log-entry-time-input').fill('23:59')
    await page.keyboard.press('Enter')
    await expect(first.getByTestId('log-entry-time')).toHaveText('23:59')
    await expect(log.entries.last()).toContainText('Called the bank')

    // Edit the text.
    await first.hover()
    await first.getByTestId('log-entry-edit').click()
    await page.getByTestId('log-entry-input').fill('Called the bank back')
    await page.keyboard.press('Enter')
    await expect(log.entry('Called the bank back')).toBeVisible()

    // Delete, then undo from the toast.
    const edited = log.entry('Called the bank back')
    await edited.hover()
    await edited.getByTestId('log-entry-delete').click()
    await expect(log.entries).toHaveCount(1)
    await page.getByTestId('toast-undo').click()
    await expect(log.entries).toHaveCount(2)
    await expect(log.entry('Called the bank back').getByTestId('log-entry-time')).toHaveText(
      '23:59',
    )

    // Yesterday is empty; → comes back; → stops at today.
    await log.prev.click()
    await expect(log.date).not.toHaveAttribute('data-day', day)
    await expect(log.empty).toBeVisible()
    await expect(page.getByTestId('log-go-today')).toBeVisible()
    await log.next.click()
    await log.showing(day)
    await expect(log.next).toBeDisabled()
    await log.prev.click()
    await page.getByTestId('log-go-today').click()
    await log.showing(day)

    // Kept after a relaunch.
    await app.close()
    await relaunch(dirs, consoleProblems, async (_app, again) => {
      const log2 = new LogPage(again)
      await log2.open()
      await expect(log2.entries).toHaveCount(2)
      await expect(log2.summary).toHaveText('0 done · 2 logged')
    })
  })
})
