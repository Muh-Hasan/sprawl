import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from './fixtures'

test('opens a dark "Sprawl" window on the vault', async ({ window, dirs }) => {
  await expect(window.getByTestId('app-root')).toBeVisible()
  await expect(window.getByTestId('shell')).toBeVisible()
  expect(existsSync(join(dirs.vault, 'sprawl.db'))).toBe(true)
  expect(await window.title()).toBe('Sprawl')

  const bodyBg = await window.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bodyBg).toBe('rgb(9, 9, 11)') // #09090B
})

test('loads the bundled Geist fonts', async ({ window }) => {
  // Fonts load lazily, and the phase 0 window has no text, so request them explicitly.
  // A face that resolves proves the @font-face URL is bundled and allowed by the CSP.
  const loaded = await window.evaluate(async () => ({
    sans: (await document.fonts.load('13px Geist')).length,
    mono: (await document.fonts.load('13px "Geist Mono"')).length,
  }))
  expect(loaded).toEqual({ sans: 1, mono: 1 })
})

test('keeps the renderer sandboxed behind window.sprawl', async ({ window }) => {
  const globals = await window.evaluate(() => ({
    sprawl: typeof (window as unknown as { sprawl?: unknown }).sprawl,
    require: typeof (window as unknown as { require?: unknown }).require,
    process: typeof (window as unknown as { process?: unknown }).process,
  }))
  expect(globals).toEqual({ sprawl: 'object', require: 'undefined', process: 'undefined' })
})

test('page zoom shortcuts do nothing (no application menu)', async ({ app, window }) => {
  await window.getByTestId('app-root').click()
  for (const key of ['Control+Equal', 'Control+Equal', 'Control+Minus', 'Control+0']) {
    await window.keyboard.press(key)
  }
  const zoom = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.webContents.getZoomFactor(),
  )
  expect(zoom).toBe(1)
})

test('runs against the isolated test profile', async ({ app, dirs }) => {
  const userData = await app.evaluate(({ app }) => app.getPath('userData'))
  expect(userData).toBe(dirs.userData)
})
