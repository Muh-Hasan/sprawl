import { expect, relaunch, test } from './fixtures'

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
  expect(await window.evaluate(() => self.sprawl.settings.get('panelWidth'))).toBe(420)
})
