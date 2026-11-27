import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, renderedFonts, test } from './fixtures'

test('opens a dark "Sprawl" window on the vault', async ({ window, dirs }) => {
  await expect(window.getByTestId('app-root')).toBeVisible()
  await expect(window.getByTestId('shell')).toBeVisible()
  expect(existsSync(join(dirs.vault, 'sprawl.db'))).toBe(true)
  expect(await window.title()).toBe('Sprawl')

  const bodyBg = await window.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bodyBg).toBe('rgb(9, 9, 11)') // #09090B
})

test('loads the bundled fonts', async ({ window }) => {
  // A face that resolves proves its @font-face URL is bundled and allowed by the CSP.
  const loaded = await window.evaluate(async () => ({
    sans: (await document.fonts.load('14px Geist')).length,
    mono: (await document.fonts.load('13px "Geist Mono"')).length,
    brand: (await document.fonts.load('600 13px Sora')).length,
  }))
  expect(loaded).toEqual({ sans: 1, mono: 1, brand: 1 })
})

test('renders UI text in Geist and paths and keys in Geist Mono', async ({ window }) => {
  await window.getByTestId('sidebar-settings').click()
  await expect(window.getByTestId('settings-vault-path')).toBeVisible()
  expect(await renderedFonts(window, '[data-testid="top-bar"] > div')).toEqual(['Geist'])
  expect(await renderedFonts(window, '[data-testid="settings-vault-path"]')).toEqual(['Geist Mono'])
  expect(await renderedFonts(window, '[data-testid="settings-about-name"]')).toEqual(['Sora'])
})

test('uses the type scale and control sizes', async ({ window }) => {
  await expect(window.getByTestId('shell')).toBeVisible()
  const sizes = await window.evaluate(() => {
    const style = (testId: string) =>
      getComputedStyle(document.querySelector(`[data-testid="${testId}"]`)!)
    const icon = document.querySelector('[data-testid="tool-note"] svg')!.getBoundingClientRect()
    return {
      body: getComputedStyle(document.body).fontSize,
      topBar: style('top-bar').height,
      toolButton: style('tool-note').height,
      icon: icon.height,
    }
  })
  expect(sizes).toEqual({ body: '14px', topBar: '44px', toolButton: '44px', icon: 22 })
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
    BrowserWindow.getAllWindows()
      .find((w) => w.getTitle() !== 'Sprawl quick capture')
      ?.webContents.getZoomFactor(),
  )
  expect(zoom).toBe(1)
})

test('runs against the isolated test profile', async ({ app, dirs }) => {
  const userData = await app.evaluate(({ app }) => app.getPath('userData'))
  expect(userData).toBe(dirs.userData)
})
