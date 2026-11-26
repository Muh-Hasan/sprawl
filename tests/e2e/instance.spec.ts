import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { appEnv, expect, MAIN_ENTRY, test } from './fixtures'

// In Node, the electron package exports the path to its executable.
const electronExe = createRequire(__filename)('electron') as string

test('a second launch focuses the first window and exits', async ({ app, window, dirs }) => {
  await expect(window.getByTestId('shell')).toBeVisible()
  const state = () =>
    app.evaluate(({ BrowserWindow }) => {
      // The main window, plus the hidden quick-capture window.
      const wins = BrowserWindow.getAllWindows()
      const main = wins.find((w) => w.getTitle() !== 'Sprawl quick capture')
      return {
        count: wins.length,
        minimized: main?.isMinimized(),
        visible: main?.isVisible(),
      }
    })

  // The page can render before the window is shown (`ready-to-show`); showing it would undo
  // the minimize.
  await expect.poll(async () => (await state()).visible).toBe(true)
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.getTitle() !== 'Sprawl quick capture')
      ?.minimize(),
  )
  await expect.poll(async () => (await state()).minimized).toBe(true)

  // Same userData folder, so the same single-instance lock.
  const second = spawn(electronExe, [MAIN_ENTRY], { env: appEnv(dirs), stdio: 'ignore' })
  const exitCode = await new Promise<number | null>((resolve) => second.on('exit', resolve))
  expect(exitCode).toBe(0)

  await expect.poll(state).toEqual({ count: 2, minimized: false, visible: true })
})
