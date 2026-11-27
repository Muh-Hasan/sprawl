import type { ElectronApplication, Page } from '@playwright/test'
import { expect, openCapture, relaunch, test } from './fixtures'

/** The zoom factor of the main window, or of the capture window. */
const zoomOf = (app: ElectronApplication, which: 'main' | 'capture'): Promise<number | undefined> =>
  app.evaluate(({ BrowserWindow }, which) => {
    const win = BrowserWindow.getAllWindows().find(
      (w) => w.webContents.getURL().endsWith('capture.html') === (which === 'capture'),
    )
    return win?.webContents.getZoomFactor()
  }, which)

/** The capture window's width in device-independent px. */
const captureWidth = (app: ElectronApplication): Promise<number | undefined> =>
  app.evaluate(
    ({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().endsWith('capture.html'))
        ?.getBounds().width,
  )

/** `--app-zoom`, which keeps the caption-button band its real width. */
const cssZoom = (page: Page): Promise<string> =>
  page.evaluate(() => document.documentElement.style.getPropertyValue('--app-zoom'))

test('Ctrl+Shift+= / - / 0 change the text size in every window, and it survives a relaunch', async ({
  app,
  window,
  dirs,
  consoleProblems,
}) => {
  await expect(window.getByTestId('shell')).toBeVisible()
  expect(await zoomOf(app, 'main')).toBe(1)

  await window.getByTestId('app-root').click()
  await window.keyboard.press('Control+Shift+Equal')
  await expect.poll(() => zoomOf(app, 'main')).toBe(1.1)
  await window.keyboard.press('Control+Shift+Equal')
  await expect.poll(() => zoomOf(app, 'main')).toBe(1.25)
  // Larger is the last step.
  await window.keyboard.press('Control+Shift+Equal')
  await window.keyboard.press('Control+Shift+Minus')
  await expect.poll(() => zoomOf(app, 'main')).toBe(1.1)
  expect(await cssZoom(window)).toBe('1.1')

  // Plain Ctrl+= is still canvas zoom, not text size.
  await window.keyboard.press('Control+Equal')
  expect(await zoomOf(app, 'main')).toBe(1.1)

  // Quick capture is zoomed too, and its window grows so the card stays 560px wide.
  await openCapture(app, consoleProblems)
  expect(await zoomOf(app, 'capture')).toBe(1.1)
  expect(await captureWidth(app)).toBe(616)
  await app.close()

  await relaunch(dirs, consoleProblems, async (app2, page) => {
    await expect(page.getByTestId('shell')).toBeVisible()
    expect(await zoomOf(app2, 'main')).toBe(1.1)
    await expect.poll(() => cssZoom(page)).toBe('1.1')
    await openCapture(app2, consoleProblems)
    expect(await zoomOf(app2, 'capture')).toBe(1.1)

    await page.bringToFront()
    await page.keyboard.press('Control+Shift+Digit0')
    await expect.poll(() => zoomOf(app2, 'main')).toBe(1)
    await expect.poll(() => zoomOf(app2, 'capture')).toBe(1)
    expect(await captureWidth(app2)).toBe(560)
    expect(await page.evaluate(() => self.sprawl.settings.get('textSize'))).toBe('default')
  })
})

test('the Settings row picks a text size', async ({ app, window }) => {
  await window.getByTestId('sidebar-settings').click()
  const small = window.getByTestId('settings-text-size-small')
  await expect(window.getByTestId('settings-text-size-default')).toHaveAttribute('data-state', 'on')
  await small.click()
  await expect(small).toHaveAttribute('data-state', 'on')
  await expect.poll(() => zoomOf(app, 'main')).toBe(0.9)
  expect(await window.evaluate(() => self.sprawl.settings.get('textSize'))).toBe('small')

  // The shortcut and the row stay in step.
  await window.keyboard.press('Control+Shift+Equal')
  await expect(window.getByTestId('settings-text-size-default')).toHaveAttribute('data-state', 'on')
  await expect.poll(() => zoomOf(app, 'main')).toBe(1)
})
