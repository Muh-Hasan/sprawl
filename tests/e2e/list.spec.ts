import { expect, openLink, relaunch, setNow, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { ListPage } from './pages/ListPage'
import { LogPage } from './pages/LogPage'
import { NotePanel } from './pages/NotePanel'

/** A local wall-clock instant in November 2026 (the app and the tests share the timezone). */
const local = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime()
const TODAY = '2026-11-25' // a Wednesday

test.describe('list view', () => {
  test.beforeEach(async ({ app, window: page }) => {
    await new CanvasPage(page).ready()
    await setNow(app, page, local(25, 10))
  })

  test('tabs, the due groups, colors, the title filter and sort; the overdue badge', async ({
    window: page,
  }) => {
    const list = new ListPage(page)
    await list.seed([
      { id: 'late', title: 'Overdue report', due: ['2026-11-24', null] },
      { id: 'today', title: 'Call Ali', color: 'sky', due: [TODAY, '15:00'] },
      { id: 'tom', title: 'Buy milk', color: 'sage', due: ['2026-11-26', null] },
      { id: 'fri', title: 'Pay rent', due: ['2026-11-27', '09:00'] },
      { id: 'next', title: 'Dentist', due: ['2026-12-10', null] },
      { id: 'idea', title: 'an idea', color: 'sage' },
      { id: 'old', title: 'Finished thing', done: true },
    ])
    await list.open()

    // Open (the default): everything not done, most recently edited first.
    await expect(list.tab('open')).toHaveAttribute('data-state', 'on')
    await expect(list.count).toHaveText('6 open')
    await expect
      .poll(() => list.titles())
      .toEqual(['an idea', 'Dentist', 'Pay rent', 'Buy milk', 'Call Ali', 'Overdue report'])
    await expect(list.row('Overdue report').getByTestId('list-row-due')).toHaveAttribute(
      'data-due',
      'overdue',
    )

    // Due: soonest first, in its groups; the sort select hides.
    await list.tab('due').click()
    await expect(list.count).toHaveText('5 due')
    await expect(page.getByTestId('list-sort')).toHaveCount(0)
    expect(await list.titles(list.group('overdue'))).toEqual(['Overdue report'])
    expect(await list.titles(list.group('today'))).toEqual(['Call Ali'])
    expect(await list.titles(list.group('tomorrow'))).toEqual(['Buy milk'])
    expect(await list.titles(list.group('week'))).toEqual(['Pay rent'])
    expect(await list.titles(list.group('later'))).toEqual(['Dentist'])
    await expect(list.group('overdue').getByRole('heading')).toHaveText('Overdue')

    // Done shows the done note, checked; All shows the seven.
    await list.tab('done').click()
    await expect.poll(() => list.titles()).toEqual(['Finished thing'])
    await expect(list.row('Finished thing').getByTestId('list-row-check')).toHaveAttribute(
      'data-state',
      'checked',
    )
    await list.tab('all').click()
    await expect(list.count).toHaveText('7 notes')

    // Colors (several at once) and the title filter.
    await list.color('sage').click()
    await expect.poll(() => list.titles()).toEqual(['an idea', 'Buy milk'])
    await list.color('sky').click()
    await expect(list.rows).toHaveCount(3)
    await list.filter.fill('ALI')
    await expect.poll(() => list.titles()).toEqual(['Call Ali'])
    await list.filter.fill('zzz')
    await expect(list.empty).toHaveText('No notes match these filters.')
    await list.filter.fill('')
    await list.color('sage').click()
    await list.color('sky').click()

    // Sort: title A–Z, untitled last.
    await page.getByTestId('list-sort').click()
    await page.getByTestId('list-sort-title').click()
    await expect
      .poll(async () => (await list.titles()).slice(0, 3))
      .toEqual(['an idea', 'Buy milk', 'Call Ali'])

    // One overdue note: the List badge says so, and follows the clock.
    await expect(list.badge).toHaveText('1')
  })

  test('the overdue badge follows the clock and goes when nothing is overdue', async ({
    app,
    window: page,
  }) => {
    const list = new ListPage(page)
    await expect(list.badge).toHaveCount(0)
    await list.seed([
      { id: 'a', title: 'Call Ali', due: [TODAY, '15:00'] },
      { id: 'b', title: 'Pay rent', due: [TODAY, null] },
    ])
    await setNow(app, page, local(25, 15, 1))
    await expect(list.badge).toHaveText('1')
    await setNow(app, page, local(26, 0, 0))
    await expect(list.badge).toHaveText('2')
    await list.open()
    await list.row('Call Ali').getByTestId('list-row-check').click()
    await expect(list.badge).toHaveText('1')
  })

  test('the checkbox marks done with a log entry and Undo; unticking in Done brings it back', async ({
    window: page,
  }) => {
    const list = new ListPage(page)
    const log = new LogPage(page)
    await list.seed([
      { id: 'a', title: 'Pay rent', due: [TODAY, null] },
      { id: 'b', title: 'Call Ali' },
    ])
    await list.open()

    await list.row('Pay rent').getByTestId('list-row-check').click()
    await expect(list.row('Pay rent')).toHaveCount(0)
    await expect(list.count).toHaveText('1 open')
    await expect(page.getByText('Marked done')).toBeVisible()
    expect((await log.stored(TODAY)).entries).toMatchObject([
      { kind: 'done', noteId: 'a', at: local(25, 10) },
    ])

    // The toast's Undo puts it back and removes the entry.
    await list.undo()
    await expect(list.row('Pay rent')).toBeVisible()
    await expect.poll(async () => (await log.stored(TODAY)).entries.length).toBe(0)

    // From the Done tab, unticking undoes done.
    await list.row('Call Ali').getByTestId('list-row-check').click()
    await expect(list.row('Call Ali')).toHaveCount(0)
    await list.tab('done').click()
    await list.row('Call Ali').getByTestId('list-row-check').click()
    await expect(list.row('Call Ali')).toHaveCount(0)
    await list.tab('open').click()
    await expect(list.row('Call Ali')).toBeVisible()
    expect((await list.stored()).find((r) => r.id === 'b')?.doneAt).toBeNull()
  })

  test('the keys: ↑↓ move, Enter opens, Space marks done, Delete deletes with Undo', async ({
    window: page,
  }) => {
    const list = new ListPage(page)
    const panel = new NotePanel(page)
    await list.seed([
      { id: 'a', title: 'First' },
      { id: 'b', title: 'Second' },
      { id: 'c', title: 'Third' },
    ])
    await list.open()
    // Most recent first: Third, Second, First.
    await page.keyboard.press('ArrowDown')
    await expect(list.row('Third')).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(list.row('Second')).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Enter')
    await panel.ready()
    await expect(panel.title).toHaveValue('Second')
    await page.keyboard.press('Escape')
    await expect(panel.root).toHaveCount(0)

    await page.keyboard.press('Space')
    await expect(list.row('Second')).toHaveCount(0)
    await expect(list.rows).toHaveCount(2)

    await page.keyboard.press('ArrowUp')
    await expect(list.row('Third')).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Delete')
    await expect(list.row('Third')).toHaveCount(0)
    await expect(page.getByText('Deleted')).toBeVisible()
    await list.undo()
    await expect(list.row('Third')).toBeVisible()

    // Typing in the filter doesn't move or delete rows; ↓ from it goes to the first row.
    await list.filter.click()
    await page.keyboard.type('i')
    await page.keyboard.press('Backspace')
    await expect(list.rows).toHaveCount(2)
    await list.filter.press('ArrowDown')
    await expect(list.row('Third')).toHaveAttribute('aria-selected', 'true')
  })

  test('"Show on canvas" flies to the card and selects it', async ({ window: page }) => {
    const list = new ListPage(page)
    const canvas = new CanvasPage(page)
    await list.seed([{ id: 'far', title: 'Far away', card: { x: 4000, y: 3000 } }])
    await list.open()
    const row = list.row('Far away')
    await list.hover(row)
    await row.getByTestId('list-row-show').click()

    await canvas.ready()
    await expect(canvas.card('Far away')).toHaveAttribute('data-selected', /.*/)
    // The glide ends with the card in the middle of the canvas.
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
  })

  test('list-only notes: New note, "Not on canvas", Place on canvas, and the panel', async ({
    window: page,
  }) => {
    const list = new ListPage(page)
    const panel = new NotePanel(page)
    const canvas = new CanvasPage(page)
    await list.open()
    await expect(list.empty).toHaveText('All clear. Nothing open right now.')

    await page.getByTestId('list-new-note').click()
    await panel.ready()
    await expect(page.getByTestId('note-panel-breadcrumb')).toHaveText('Note · not on canvas')
    await expect(panel.title).toBeFocused()
    await page.keyboard.type('Plan the trip')
    await expect(list.row('Plan the trip')).toBeVisible()
    await expect(list.row('Plan the trip').getByTestId('list-row-not-on-canvas')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')

    // Duplicate from the menu: another list-only note.
    await list.menu('Plan the trip', 'duplicate')
    await expect(list.row('Plan the trip')).toHaveCount(2)

    await list.menu('Plan the trip', 'place')
    await expect(list.row('Plan the trip').getByTestId('list-row-not-on-canvas')).toHaveCount(1)
    await page.getByTestId('rail-canvas').click()
    await canvas.ready()
    await expect(canvas.cards).toHaveCount(1)

    // The other copy, deleted from the panel (it has no card), comes back with Undo.
    await list.open()
    const copy = list.rows.filter({ has: page.getByTestId('list-row-not-on-canvas') })
    await copy.click()
    await panel.ready()
    await page.getByTestId('note-panel-menu').click()
    await page.getByTestId('note-panel-delete').click()
    await expect(panel.root).toHaveCount(0)
    await expect(list.rows).toHaveCount(1)
    await list.undo()
    await expect(list.rows).toHaveCount(2)
  })

  test('the filter is remembered, and the morning summary link opens the Due tab', async ({
    app,
    window: page,
    dirs,
    consoleProblems,
  }) => {
    const list = new ListPage(page)
    await list.seed([{ id: 'a', title: 'Buy milk', color: 'sage', due: [TODAY, null] }])
    await list.open()
    await list.tab('all').click()
    await list.color('sage').click()
    await page.getByTestId('rail-canvas').click()

    await openLink(app, 'sprawl://list/due')
    await expect(list.root).toBeVisible()
    await expect(list.tab('due')).toHaveAttribute('data-state', 'on')
    await expect(list.color('sage')).toHaveAttribute('aria-pressed', 'true')
    await app.close()

    await relaunch(dirs, consoleProblems, async (_app, next) => {
      const again = new ListPage(next)
      await new CanvasPage(next).ready()
      await again.open()
      await expect(again.tab('due')).toHaveAttribute('data-state', 'on')
      await expect(again.color('sage')).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
