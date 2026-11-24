import type { Page } from '@playwright/test'
import { expect, relaunch, test } from './fixtures'

const VIEWS = ['canvas', 'list', 'log', 'drawings', 'settings'] as const

async function expectActive(window: Page, view: (typeof VIEWS)[number]): Promise<void> {
  await expect(window.getByTestId(`view-${view}`)).toBeVisible()
  await expect(window.getByTestId(`rail-${view}`)).toHaveAttribute('aria-current', 'page')
  // Exactly one white bar, next to the active item.
  const bar = window.getByTestId('rail-active-bar')
  await expect(bar).toHaveCount(1)
  const barBox = await bar.boundingBox()
  const itemBox = await window.getByTestId(`rail-${view}`).boundingBox()
  expect(barBox && itemBox).toBeTruthy()
  expect(
    Math.abs(barBox!.y + barBox!.height / 2 - (itemBox!.y + itemBox!.height / 2)),
  ).toBeLessThan(1)
  expect(barBox!.x).toBe(0) // on the rail's left edge
  expect({ w: barBox!.width, h: barBox!.height }).toEqual({ w: 2, h: 16 })
  expect(await bar.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(250, 250, 250)',
  )
}

test('opens on the canvas with the rail', async ({ window }) => {
  await expect(window.getByTestId('rail')).toBeVisible()
  await expectActive(window, 'canvas')
})

test('rail clicks switch views and move the white bar', async ({ window }) => {
  for (const view of [...VIEWS].reverse()) {
    await window.getByTestId(`rail-${view}`).click()
    await expectActive(window, view)
    for (const other of VIEWS.filter((v) => v !== view)) {
      await expect(window.getByTestId(`rail-${other}`)).not.toHaveAttribute('aria-current', 'page')
    }
  }
})

test('Ctrl+1–4 switch views', async ({ window }) => {
  await window.getByTestId('rail-settings').click()
  await expectActive(window, 'settings')
  const keys = [
    ['Control+2', 'list'],
    ['Control+3', 'log'],
    ['Control+4', 'drawings'],
    ['Control+1', 'canvas'],
  ] as const
  for (const [key, view] of keys) {
    await window.keyboard.press(key)
    await expectActive(window, view)
  }
})

test('view titles and the caption-button clearance in the top bar', async ({ window }) => {
  await expect(window.getByTestId('shell')).toBeVisible()
  await window.keyboard.press('Control+3')
  await expect(window.getByTestId('top-bar')).toContainText('Daily log')
  await window.keyboard.press('Control+4')
  await expect(window.getByTestId('top-bar')).toContainText('Drawings')
  const paddingRight = await window
    .getByTestId('top-bar')
    .evaluate((el) => getComputedStyle(el).paddingRight)
  expect(paddingRight).toBe('140px')
})

test('the rail tooltip shows the label and shortcut', async ({ window }) => {
  await window.getByTestId('rail-list').hover()
  const tooltip = window.getByRole('tooltip')
  await expect(tooltip).toContainText('List')
  await expect(tooltip).toContainText('Ctrl+2')
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
    const win = BrowserWindow.getAllWindows()[0]
    win?.setBounds(bounds)
    win?.close()
  }, target)
  await closed

  await relaunch(dirs, consoleProblems, async (next, page) => {
    await expect(page.getByTestId('shell')).toBeVisible()
    const bounds = await next.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.getBounds(),
    )
    // Allow a pixel of rounding under display scaling.
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs((bounds?.[key] ?? 0) - target[key]), key).toBeLessThanOrEqual(1)
    }
  })
})
