import type { Page } from '@playwright/test'
import { expect, relaunch, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { NotePanel } from './pages/NotePanel'

const VIEWS = ['canvas', 'list', 'log', 'settings'] as const

async function expectActive(window: Page, view: (typeof VIEWS)[number]): Promise<void> {
  await expect(window.getByTestId(`view-${view}`)).toBeVisible()
  await expect(window.getByTestId(`sidebar-${view}`)).toHaveAttribute('aria-current', 'page')
  for (const other of VIEWS.filter((v) => v !== view)) {
    await expect(window.getByTestId(`sidebar-${other}`)).not.toHaveAttribute('aria-current')
  }
}

const sidebarWidth = (window: Page): Promise<number> =>
  window.getByTestId('sidebar').evaluate((el) => el.getBoundingClientRect().width)

test('opens on the canvas with the sidebar open', async ({ window }) => {
  const sidebar = window.getByTestId('sidebar')
  await expect(sidebar).toHaveAttribute('data-collapsed', 'false')
  expect(await sidebarWidth(window)).toBe(248)
  await expect(sidebar).toContainText('New note')
  await expect(sidebar).toContainText('Search or jump to…')
  await expect(window.getByTestId('sidebar-log')).toContainText('Daily log')
  await expect(window.getByTestId('sidebar-list')).toContainText('Ctrl 2')
  await expectActive(window, 'canvas')
})

test('sidebar clicks switch views', async ({ window }) => {
  for (const view of [...VIEWS].reverse()) {
    await window.getByTestId(`sidebar-${view}`).click()
    await expectActive(window, view)
  }
})

test('Ctrl+1–3 and Ctrl+, switch views, and Ctrl+4 does nothing', async ({ window }) => {
  await expectActive(window, 'canvas')
  await window.keyboard.press('Control+Comma')
  await expectActive(window, 'settings')
  const keys = [
    ['Control+2', 'list'],
    ['Control+3', 'log'],
    ['Control+1', 'canvas'],
  ] as const
  for (const [key, view] of keys) {
    await window.keyboard.press(key)
    await expectActive(window, view)
  }
  await window.keyboard.press('Control+4')
  await expectActive(window, 'canvas')
})

test('view titles and the caption-button clearance in the top bar', async ({ window }) => {
  await expect(window.getByTestId('shell')).toBeVisible()
  await window.keyboard.press('Control+3')
  await expect(window.getByTestId('top-bar')).toContainText('Daily log')
  const paddingRight = await window
    .getByTestId('top-bar')
    .evaluate((el) => getComputedStyle(el).paddingRight)
  expect(paddingRight).toBe('140px')
})

test('the collapse button names its shortcut', async ({ window }) => {
  await window.getByTestId('sidebar-toggle').hover()
  const tooltip = window.getByRole('tooltip')
  await expect(tooltip).toContainText('Collapse sidebar')
  await expect(tooltip).toContainText('Ctrl \\')
})

test('Ctrl+\\ collapses the sidebar to a rail with tooltips, and the choice survives a relaunch', async ({
  app,
  window,
  dirs,
  consoleProblems,
}) => {
  const sidebar = window.getByTestId('sidebar')
  const canvasWidth = (page: Page) =>
    page.getByTestId('canvas').evaluate((el) => el.getBoundingClientRect().width)
  const before = await canvasWidth(window)

  await window.keyboard.press('Control+Backslash')
  await expect(sidebar).toHaveAttribute('data-collapsed', 'true')
  expect(await sidebarWidth(window)).toBe(60)
  // The canvas takes the room the sidebar gave up.
  await expect.poll(() => canvasWidth(window)).toBe(before + 188)
  await expect(sidebar).not.toContainText('Search or jump to…')

  // The rail still switches views, with a tooltip naming each one and its shortcut.
  await window.getByTestId('sidebar-list').hover()
  const tooltip = window.getByRole('tooltip')
  await expect(tooltip).toContainText('List')
  await expect(tooltip).toContainText('Ctrl 2')
  await window.getByTestId('sidebar-list').click()
  await expectActive(window, 'list')

  await app.close()
  await relaunch(dirs, consoleProblems, async (_app, page) => {
    const again = page.getByTestId('sidebar')
    await expect(again).toHaveAttribute('data-collapsed', 'true')
    // Its toggle opens it again, and that's saved too.
    await page.getByTestId('sidebar-toggle').click()
    await expect(again).toHaveAttribute('data-collapsed', 'false')
    expect(await sidebarWidth(page)).toBe(248)
    await page.keyboard.press('Control+Backslash')
    await expect(again).toHaveAttribute('data-collapsed', 'true')
    await page.keyboard.press('Control+Backslash')
  })
  await relaunch(dirs, consoleProblems, async (_app, page) => {
    await expect(page.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false')
  })
})

test('New note and Recent: the notes edited last, newest first, open from the sidebar', async ({
  window,
}) => {
  const canvas = new CanvasPage(window)
  await canvas.ready()
  const recent = window.getByTestId('sidebar-recent-note')
  /** New note, a title, and Enter on to the card's body (which takes the focus once loaded). */
  const addNote = async (title: string): Promise<void> => {
    await window.getByTestId('sidebar-new-note').click()
    await expect(canvas.titleInput).toBeFocused()
    await window.keyboard.type(title)
    await window.keyboard.press('Enter')
    await expect(canvas.card(title)).toBeVisible()
    await expect(window.locator('[data-card-editor] [contenteditable="true"]')).toBeFocused()
  }

  await addNote('First idea')
  await addNote('Second idea')
  await expect(recent.first()).toHaveText('Second idea')
  await expect(recent.nth(1)).toHaveText('First idea')

  // At most five.
  for (const title of ['Three', 'Four', 'Five', 'Six']) await addNote(title)
  await expect(recent).toHaveCount(5)
  await expect(recent.first()).toHaveText('Six')
  await expect(window.getByTestId('sidebar-recent')).not.toContainText('First idea')

  // A click opens it in the panel, from any view.
  await window.keyboard.press('Control+3')
  await recent.filter({ hasText: 'Four' }).click()
  const panel = new NotePanel(window)
  await panel.ready()
  await expect(panel.title).toHaveValue('Four')
  await expect(recent.filter({ hasText: 'Four' })).toHaveAttribute('data-active', 'true')
})

test('the palette toggles the sidebar', async ({ window }) => {
  await window.getByTestId('sidebar-search').click()
  await window.getByTestId('palette-input').fill('>sidebar')
  await expect(window.getByTestId('palette-command-toggle-sidebar')).toHaveText(/Collapse sidebar/)
  await window.keyboard.press('Enter')
  await expect(window.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true')
  await window.keyboard.press('Control+K')
  await window.getByTestId('palette-input').fill('>toggle sidebar')
  await expect(window.getByTestId('palette-command-toggle-sidebar')).toHaveText(/Expand sidebar/)
})

test('the window size and position are remembered', async ({
  app,
  window,
  dirs,
  consoleProblems,
}) => {
  await expect(window.getByTestId('shell')).toBeVisible()
  const target = { x: 120, y: 90, width: 1100, height: 720 }
  // Resize, then close the window straight away like a user would: the close-time save has
  // to catch it, since the debounced save hasn't fired yet.
  const closed = app.waitForEvent('close')
  await app.evaluate(({ BrowserWindow }, bounds) => {
    const win = BrowserWindow.getAllWindows().find((w) => w.getTitle() !== 'Sprawl quick capture')
    win?.setBounds(bounds)
    win?.close()
  }, target)
  await closed

  await relaunch(dirs, consoleProblems, async (next, page) => {
    await expect(page.getByTestId('shell')).toBeVisible()
    const bounds = await next.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.getTitle() !== 'Sprawl quick capture')
        ?.getBounds(),
    )
    // Allow a pixel of rounding under display scaling.
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs((bounds?.[key] ?? 0) - target[key]), key).toBeLessThanOrEqual(1)
    }
  })
})
