import { expect, relaunch, test } from './fixtures'
import { SettingsPage } from './pages/SettingsPage'

test('settings round-trip through IPC and persist across a relaunch', async ({
  app,
  window,
  dirs,
  consoleProblems,
}) => {
  await window.evaluate(async () => {
    await self.sprawl.settings.set('snap', false)
    await self.sprawl.settings.set('panelWidth', 512)
    await self.sprawl.settings.set('keepInTray', false)
  })
  await app.close()

  await relaunch(dirs, consoleProblems, async (_app, page) => {
    await expect(page.getByTestId('shell')).toBeVisible()
    const all = await page.evaluate(() => self.sprawl.settings.getAll())
    expect(all).toMatchObject({ snap: false, panelWidth: 512, keepInTray: false, showDone: false })
  })
})

test('main rejects invalid IPC input', async ({ window }) => {
  const errors = await window.evaluate(async () => {
    const attempt = async (fn: () => Promise<unknown>) => {
      try {
        await fn()
        return null
      } catch (err) {
        return String(err)
      }
    }
    // Bypass the TypeScript types to send what a compromised renderer could.
    const api = self.sprawl as unknown as {
      settings: { set(k: string, v: unknown): Promise<void>; get(k: string): Promise<unknown> }
      app: { openExternal(u: string): Promise<void>; openVault(p: string): Promise<unknown> }
    }
    return [
      await attempt(() => api.settings.set('panelWidth', 9000)),
      await attempt(() => api.settings.set('nope', true)),
      await attempt(() => api.settings.get('nope')),
      await attempt(() => api.app.openExternal('file:///C:/Windows/System32/calc.exe')),
      await attempt(() => api.app.openVault('relative\\folder')),
    ]
  })
  for (const error of errors) expect(error).toMatch(/\[invalid-input\]/)
  expect(await window.evaluate(() => self.sprawl.settings.get('panelWidth'))).toBe(440)
})

test('the section menu shows one section at a time', async ({ window }) => {
  const settings = new SettingsPage(window)
  await settings.open()
  await expect(settings.menu('general')).toHaveAttribute('aria-current', 'page')
  await expect(window.getByTestId('settings-vault-path')).toBeVisible()

  const sections = [
    ['appearance', 'settings-text-size-default'],
    ['canvas', 'settings-show-done'],
    ['notifications', 'settings-reminders'],
    ['capture', 'settings-shortcut'],
    ['backup', 'settings-export'],
    ['shortcuts', 'settings-shortcut-palette'],
    ['about', 'settings-about-github'],
  ] as const
  for (const [id, row] of sections) {
    await settings.menu(id).click()
    await expect(settings.menu(id)).toHaveAttribute('aria-current', 'page')
    await expect(window.getByTestId(row)).toBeVisible()
    await expect(window.locator('[data-testid^="settings-"][aria-labelledby]')).toHaveCount(1)
  }
  await expect(window.getByTestId('settings-shortcut-palette')).toHaveCount(0)
  await settings.menu('shortcuts').click()
  await expect(window.getByTestId('settings-shortcut-palette')).toContainText('CtrlK')
  await expect(window.getByTestId('settings-shortcut-capture')).toContainText('CtrlShiftSpace')
})

test('rows for features still to come are disabled', async ({ window }) => {
  const settings = new SettingsPage(window)
  await settings.open('canvas')
  await expect(window.getByTestId('settings-snap')).toBeDisabled()
  await expect(window.getByTestId('settings-show-done')).toBeEnabled()

  await settings.menu('backup').click()
  for (const id of ['settings-auto-backup', 'settings-backup-now', 'settings-export']) {
    await expect(window.getByTestId(id)).toBeDisabled()
  }
  await expect(settings.section('backup').getByText('Coming soon')).toHaveCount(3)

  await settings.menu('appearance').click()
  await expect(window.getByTestId('settings-reduce-motion')).toBeDisabled()
  await expect(window.getByTestId('settings-reduce-motion-row')).toContainText('Coming soon')
})

test('Appearance collapses the sidebar, in step with its shortcut', async ({ window }) => {
  const sidebar = window.getByTestId('sidebar')
  const icons = window.getByTestId('settings-sidebar-icons')
  const labels = window.getByTestId('settings-sidebar-labels')
  await new SettingsPage(window).open('appearance')
  await expect(labels).toHaveAttribute('data-state', 'on')

  await icons.click()
  await expect(sidebar).toHaveAttribute('data-collapsed', 'true')
  await expect(icons).toHaveAttribute('data-state', 'on')
  await expect
    .poll(() => window.evaluate(() => self.sprawl.settings.get('sidebarCollapsed')))
    .toBe(true)

  await window.keyboard.press('Control+Backslash')
  await expect(sidebar).toHaveAttribute('data-collapsed', 'false')
  await expect(labels).toHaveAttribute('data-state', 'on')
})
