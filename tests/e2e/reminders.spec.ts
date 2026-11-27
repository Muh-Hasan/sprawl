import { expect, notifications, openLink, relaunch, setNow, test, trayState } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { ListPage } from './pages/ListPage'
import { NotePanel } from './pages/NotePanel'

/** A local wall-clock instant in November 2026. */
const local = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime()
const TODAY = '2026-11-25'

test.describe('reminders (fixed clock, recorded toasts)', () => {
  test.beforeEach(async ({ app, window: page }) => {
    await new CanvasPage(page).ready()
    await setNow(app, page, local(25, 9))
  })

  test('a reminder fires once at its time; clicking it opens the note', async ({
    app,
    window: page,
  }) => {
    const list = new ListPage(page)
    const panel = new NotePanel(page)
    await list.seed([{ id: 'rent', title: 'Pay rent', due: [TODAY, '10:00'], remind: 'at' }])

    await setNow(app, page, local(25, 9, 59))
    expect(await notifications(app)).toEqual([])
    await setNow(app, page, local(25, 10))
    await expect
      .poll(() => notifications(app))
      .toEqual([{ title: 'Pay rent', body: 'Due today at 10:00', link: 'sprawl://note/rent' }])
    await setNow(app, page, local(25, 10, 5))
    expect(await notifications(app)).toHaveLength(1)

    await openLink(app, 'sprawl://note/rent')
    await panel.ready()
    await expect(panel.title).toHaveValue('Pay rent')
  })

  test('a reminder set in the panel fires; marking the note done first cancels it', async ({
    app,
    window: page,
  }) => {
    const list = new ListPage(page)
    await list.seed([
      { id: 'a', title: 'Gym', due: [TODAY, '11:00'], remind: '1h' },
      { id: 'b', title: 'Call Ali', due: [TODAY, '11:00'], remind: '1h' },
    ])
    await list.open()
    await list.row('Gym').getByTestId('list-row-check').click()
    await expect(list.row('Gym')).toHaveCount(0)

    await setNow(app, page, local(25, 10))
    await expect.poll(() => notifications(app)).toHaveLength(1)
    expect((await notifications(app))[0]).toMatchObject({ title: 'Call Ali' })
  })

  test('the overdue nudge comes once, after the reminder', async ({ app, window: page }) => {
    await new ListPage(page).seed([
      { id: 'a', title: 'Report', due: [TODAY, '15:00'], remind: '15m' },
    ])
    await setNow(app, page, local(25, 14, 45))
    await setNow(app, page, local(25, 15))
    await setNow(app, page, local(25, 16))
    expect((await notifications(app)).map((t) => t.body)).toEqual([
      'Due today at 15:00',
      'Overdue since 15:00',
    ])
  })

  test('the morning summary counts today and overdue, and opens the Due tab', async ({
    app,
    window: page,
  }) => {
    await setNow(app, page, local(25, 8))
    await new ListPage(page).seed([
      { id: 'a', title: 'Today', due: [TODAY, null] },
      { id: 'b', title: 'Late', due: ['2026-11-23', null] },
    ])
    await page.evaluate(() =>
      self.sprawl.settings.set('morningSummary', { on: true, time: '09:00' }),
    )
    await setNow(app, page, local(25, 9))
    await expect
      .poll(() => notifications(app))
      .toEqual([
        {
          title: 'Today in Sprawl',
          body: '1 due today · 1 overdue',
          link: 'sprawl://list/due',
          silent: true,
        },
      ])
    await openLink(app, 'sprawl://list/due')
    const list = new ListPage(page)
    await expect(list.root).toBeVisible()
    await expect(list.tab('due')).toHaveAttribute('data-state', 'on')
  })

  test('missed reminders give one summary on the next launch', async ({
    app,
    window: page,
    dirs,
    consoleProblems,
  }) => {
    await setNow(app, page, local(25, 7))
    await new ListPage(page).seed([
      { id: 'a', title: 'One', due: [TODAY, '08:00'], remind: 'at' },
      { id: 'b', title: 'Two', due: [TODAY, '08:30'], remind: 'at' },
    ])
    expect(await notifications(app)).toEqual([])
    await app.close()

    // Relaunched later on the real clock (after 25 Nov 2026): both were missed.
    await relaunch(dirs, consoleProblems, async (next) => {
      await expect
        .poll(() => notifications(next))
        .toEqual([
          {
            title: 'While you were away',
            body: '2 reminders · 2 now overdue',
            link: 'sprawl://list/due',
          },
        ])
    })
  })

  test('due reminders off, and pausing for an hour', async ({ app, window: page }) => {
    await new ListPage(page).seed([
      { id: 'a', title: 'Muted', due: [TODAY, '09:30'], remind: 'at' },
      { id: 'b', title: 'Held', due: [TODAY, '11:00'], remind: 'at' },
    ])
    // Turned off in Settings: the 09:30 one is skipped for good.
    await page.getByTestId('sidebar-settings').click()
    await page.getByTestId('settings-reminders').click()
    await expect(page.getByTestId('settings-reminders')).toHaveAttribute('data-state', 'unchecked')
    await setNow(app, page, local(25, 9, 30))
    await page.getByTestId('settings-reminders').click()
    await setNow(app, page, local(25, 9, 45))
    expect(await notifications(app)).toEqual([])

    // Paused at 10:30 for an hour: the 11:00 one waits until 11:30.
    await setNow(app, page, local(25, 10, 30))
    await page.evaluate(() => self.sprawl.system.pauseNotifications(60))
    await expect.poll(async () => (await trayState(app)).paused).toBe(true)
    await setNow(app, page, local(25, 11))
    expect(await notifications(app)).toEqual([])
    await setNow(app, page, local(25, 11, 30))
    await expect.poll(async () => (await notifications(app)).map((t) => t.title)).toEqual(['Held'])
    expect((await trayState(app)).paused).toBe(false)
  })

  test('Settings sends a test notification', async ({ app, window: page }) => {
    await page.getByTestId('sidebar-settings').click()
    await expect(page.getByTestId('settings-notifications-blocked')).toHaveCount(0)
    await page.getByTestId('settings-test-notification').click()
    await expect
      .poll(async () => (await notifications(app)).map((t) => t.title))
      .toEqual(['Sprawl'])
  })
})
