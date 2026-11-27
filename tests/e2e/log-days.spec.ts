import { expect, setNow, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { LogPage } from './pages/LogPage'

/** A local wall-clock instant (the tests and the app share this machine's timezone). */
const local = (d: number, h: number, m = 0, s = 0) => new Date(2026, 10, d, h, m, s).getTime()

test.describe('daily log days (fixed clock)', () => {
  test('entries land on the right day, ← and → move between days, and the week strip dots match', async ({
    app,
    window: page,
  }) => {
    const canvas = new CanvasPage(page)
    const log = new LogPage(page)
    await canvas.ready()
    await canvas.seed([
      { key: 'late', x: 100, y: 120, title: 'Late one' },
      { key: 'morning', x: 400, y: 120, title: 'Morning one' },
    ])

    // Done a few seconds before midnight on the 24th: it's the 24th's.
    await setNow(app, page, local(24, 23, 59, 50))
    await canvas.card('Late one').click()
    await page.keyboard.press('Control+Enter')
    await expect(canvas.card('Late one')).toHaveCount(0)

    // Just after midnight: the 25th, and the status pill follows.
    await setNow(app, page, local(25, 0, 0, 5))
    await expect(page.getByTestId('status-pill')).toContainText('Wed 25 Nov · Nothing done yet')
    await canvas.card('Morning one').click()
    await page.keyboard.press('Control+Enter')
    await expect(page.getByTestId('status-pill')).toContainText('1 done today')

    // A manual entry on the 26th at 09:15.
    await setNow(app, page, local(26, 9, 15))
    await log.open()
    await log.showing('2026-11-26')
    await expect(log.date).toHaveText('Thursday, 26 November')
    await log.add('Standup')
    await expect(log.entry('Standup').getByTestId('log-entry-time')).toHaveText('09:15')

    // ← goes back a day at a time.
    await log.prev.click()
    await log.showing('2026-11-25')
    await expect(log.entries).toHaveCount(1)
    await expect(log.entry('Morning one').getByTestId('log-entry-time')).toHaveText('00:00')
    await log.prev.click()
    await log.showing('2026-11-24')
    await expect(log.entry('Late one').getByTestId('log-entry-time')).toHaveText('23:59')
    await log.prev.click()
    await log.showing('2026-11-23')
    await expect(log.empty).toBeVisible()

    // → comes forward, and stops at today; Ctrl+[ and Ctrl+] do the same.
    await log.next.click()
    await log.showing('2026-11-24')
    await page.keyboard.press('Control+]')
    await page.keyboard.press('Control+]')
    await log.showing('2026-11-26')
    await expect(log.next).toBeDisabled()
    await page.keyboard.press('Control+]')
    await log.showing('2026-11-26')
    await page.keyboard.press('Control+[')
    await log.showing('2026-11-25')

    // The week strip: the 7 days up to today, dots on the days with entries.
    await expect(log.stripDays).toHaveCount(7)
    await expect(log.stripDays.first()).toHaveAttribute('data-day', '2026-11-20')
    await expect(log.stripDays.last()).toHaveAttribute('data-day', '2026-11-26')
    await expect(log.stripDay('2026-11-26')).toHaveAttribute('data-today', 'true')
    await expect(log.stripDay('2026-11-25')).toHaveAttribute('data-selected', 'true')
    const marked = page.locator('[data-testid="log-strip-day"][data-has-entries]')
    await expect(marked).toHaveCount(3)
    for (const day of ['2026-11-24', '2026-11-25', '2026-11-26'])
      await expect(log.stripDay(day)).toHaveAttribute('data-has-entries', 'true')

    // Clicking a strip day shows it.
    await log.stripDay('2026-11-24').click()
    await log.showing('2026-11-24')

    // Further back, the strip ends on the selected day.
    await log.stripDay('2026-11-20').click()
    await log.prev.click()
    await log.showing('2026-11-19')
    await expect(log.stripDays.last()).toHaveAttribute('data-day', '2026-11-19')
    await expect(marked).toHaveCount(0)

    // The month picker jumps to a day and marks the days with entries.
    await page.getByTestId('log-calendar').click()
    const picker = page.getByTestId('log-month-picker')
    await expect(picker).toBeVisible()
    await picker.getByRole('button', { name: /November 25/ }).click()
    await log.showing('2026-11-25')
    await expect(picker).toHaveCount(0)
  })

  test('carried over lists the notes edited yesterday and not done', async ({
    app,
    window: page,
  }) => {
    const canvas = new CanvasPage(page)
    const log = new LogPage(page)
    await canvas.ready()

    // Notes made (and so edited) on the 24th; one is done on the 24th.
    await setNow(app, page, local(24, 15))
    await canvas.seed([
      { key: 'open', x: 100, y: 120, title: 'Still open' },
      { key: 'done', x: 400, y: 120, title: 'Finished' },
    ])
    await page.evaluate(async () => {
      await self.sprawl.notes.update('n-open', { title: 'Still open' })
      await self.sprawl.notes.update('n-done', { title: 'Finished' })
      await self.sprawl.notes.setDone('n-done', true)
    })

    await setNow(app, page, local(25, 10))
    await log.open()
    await log.showing('2026-11-25')
    const rows = page.getByTestId('log-carried-row')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Still open')

    // Open goes to the note.
    await rows.first().getByTestId('log-carried-open').click()
    await expect(page.getByTestId('note-panel')).toHaveAttribute('data-note-id', 'n-open')
  })
})
