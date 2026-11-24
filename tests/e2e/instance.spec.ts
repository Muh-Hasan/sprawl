import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { appEnv, expect, MAIN_ENTRY, test } from './fixtures'

// In Node, the electron package exports the path to its executable.
const electronExe = createRequire(__filename)('electron') as string

test('a second launch focuses the first window and exits', async ({ app, window, dirs }) => {
  await expect(window.getByTestId('shell')).toBeVisible()
  const state = () =>
    app.evaluate(({ BrowserWindow }) => {
      const wins = BrowserWindow.getAllWindows()
      return {
        count: wins.length,
        minimized: wins[0]?.isMinimized(),
        visible: wins[0]?.isVisible(),
      }
    })

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.minimize())
  await expect.poll(async () => (await state()).minimized).toBe(true)

  // Same userData folder, so the same single-instance lock.
  const second = spawn(electronExe, [MAIN_ENTRY], { env: appEnv(dirs), stdio: 'ignore' })
  const exitCode = await new Promise<number | null>((resolve) => second.on('exit', resolve))
  expect(exitCode).toBe(0)

  await expect.poll(state).toEqual({ count: 1, minimized: false, visible: true })
})
