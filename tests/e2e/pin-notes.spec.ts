import { expect, relaunch, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { ListPage } from './pages/ListPage'
import { NotePanel } from './pages/NotePanel'

test('a note pinned from its card shows in the sidebar, opens from there and unpins', async ({
  window: page,
}) => {
  const canvas = new CanvasPage(page)
  await canvas.ready()
  await canvas.seed([
    { key: 'a', x: 100, y: 120, title: 'Q4 planning' },
    { key: 'b', x: 400, y: 120, title: 'Groceries' },
  ])
  const pinned = page.getByTestId('sidebar-pinned-note')
  const recent = page.getByTestId('sidebar-recent')
  await expect(page.getByTestId('sidebar-pinned')).toBeHidden()
  await expect(recent).toContainText('Q4 planning')

  await canvas.card('Q4 planning').click({ button: 'right' })
  const pin = page.getByTestId('menu-pin')
  await expect(pin).toHaveText('Pin to sidebar')
  await pin.click()
  await expect(pinned).toHaveText(['Q4 planning'])
  // A pinned note isn't listed twice.
  await expect(recent).not.toContainText('Q4 planning')
  await expect(recent).toContainText('Groceries')

  // It opens from any view.
  await page.keyboard.press('Control+3')
  await pinned.click()
  const panel = new NotePanel(page)
  await panel.ready()
  await expect(panel.title).toHaveValue('Q4 planning')
  await expect(pinned).toHaveAttribute('data-active', 'true')

  // The panel's menu unpins it, and the card's menu follows.
  await page.getByTestId('note-panel-menu').click()
  const unpin = page.getByTestId('note-panel-pin')
  await expect(unpin).toHaveText('Unpin from sidebar')
  await unpin.click()
  await expect(page.getByTestId('sidebar-pinned')).toBeHidden()
  await expect(recent).toContainText('Q4 planning')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+1')
  await canvas.card('Q4 planning').click({ button: 'right' })
  await expect(page.getByTestId('menu-pin')).toHaveText('Pin to sidebar')
})

test('notes pinned from the List keep their order across a relaunch', async ({
  app,
  window: page,
  dirs,
  consoleProblems,
}) => {
  await new CanvasPage(page).ready()
  const list = new ListPage(page)
  await list.seed([
    { id: 'a', title: 'Homepage redo' },
    { id: 'b', title: 'Q4 planning' },
    { id: 'c', title: 'Call the dentist' },
  ])
  await list.open()
  await list.menu('Q4 planning', 'pin')
  await list.menu('Homepage redo', 'pin')
  const pinned = page.getByTestId('sidebar-pinned-note')
  await expect(pinned).toHaveText(['Q4 planning', 'Homepage redo'])
  // Pinning isn't an edit: the List's order by edited time stays.
  await expect
    .poll(() => list.titles())
    .toEqual(['Call the dentist', 'Q4 planning', 'Homepage redo'])

  await app.close()
  await relaunch(dirs, consoleProblems, async (_app, again) => {
    await expect(again.getByTestId('sidebar-pinned-note')).toHaveText([
      'Q4 planning',
      'Homepage redo',
    ])
  })
})
