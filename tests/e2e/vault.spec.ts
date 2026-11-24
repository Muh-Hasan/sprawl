import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { ElectronApplication, Page } from '@playwright/test'
import { expect, relaunch, renderedFonts, stubFolderPicker, test, type TestDirs } from './fixtures'

// The real first-run flow: no SPRAWL_VAULT, and (PHASES.md) the E2E flag off.
const FIRST_RUN = { useVault: false, env: { SPRAWL_E2E: '0' } }

/** Runs onboarding with a temp folder (never the real Documents) and waits for the shell. */
async function onboard(app: ElectronApplication, window: Page, folder: string): Promise<void> {
  await stubFolderPicker(app, folder)
  await window.getByTestId('onboarding-choose').click()
  await expect(window.getByTestId('onboarding-path')).toHaveValue(folder)
  await window.getByTestId('onboarding-start').click()
  await expect(window.getByTestId('shell')).toBeVisible()
}

const configFile = (dirs: TestDirs) => join(dirs.userData, 'config.json')

test.describe('vault', () => {
  test.use({ appLaunch: FIRST_RUN })

  test('first launch shows onboarding; Start creates the vault; a relaunch skips onboarding', async ({
    app,
    window,
    dirs,
    consoleProblems,
  }) => {
    await expect(window.getByTestId('onboarding')).toBeVisible()
    await expect(window.getByText('Welcome to sprawl')).toBeVisible()
    expect(await renderedFonts(window, '[data-testid="onboarding-title"]')).toEqual(['Sora'])
    // Prefilled with Documents\Sprawl.
    await expect(window.getByTestId('onboarding-path')).toHaveValue(/[\\/]Sprawl$/)

    // Choose… a temp folder (never create a vault in the real Documents).
    const chosen = join(dirs.root, 'My Vault')
    await stubFolderPicker(app, chosen)
    await window.getByTestId('onboarding-choose').click()
    await expect(window.getByTestId('onboarding-path')).toHaveValue(chosen)

    await window.getByTestId('onboarding-start').click()
    await expect(window.getByTestId('shell')).toBeVisible()
    await expect(window.getByTestId('view-canvas')).toBeVisible()
    expect(existsSync(join(chosen, 'sprawl.db'))).toBe(true)
    expect(JSON.parse(readFileSync(configFile(dirs), 'utf8')).vaultPath).toBe(chosen)

    await app.close()
    await relaunch(
      dirs,
      consoleProblems,
      async (_app, page) => {
        await expect(page.getByTestId('shell')).toBeVisible()
        await expect(page.getByTestId('onboarding')).toHaveCount(0)
      },
      FIRST_RUN,
    )
  })

  test('deleting config.json brings onboarding back', async ({
    app,
    window,
    dirs,
    consoleProblems,
  }) => {
    const chosen = join(dirs.root, 'Vault')
    await onboard(app, window, chosen)
    await app.close()

    rmSync(configFile(dirs))
    await relaunch(
      dirs,
      consoleProblems,
      async (_app, page) => {
        await expect(page.getByTestId('onboarding')).toBeVisible()
        // The vault itself is untouched.
        expect(existsSync(join(chosen, 'sprawl.db'))).toBe(true)
      },
      FIRST_RUN,
    )
  })

  test('a remembered vault that was deleted brings onboarding back', async ({
    app,
    window,
    dirs,
    consoleProblems,
  }) => {
    const chosen = join(dirs.root, 'Gone')
    await onboard(app, window, chosen)
    await app.close()

    rmSync(chosen, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
    await relaunch(
      dirs,
      consoleProblems,
      async (_app, page) => {
        await expect(page.getByTestId('onboarding')).toBeVisible()
        expect(existsSync(chosen)).toBe(false) // not silently recreated
      },
      FIRST_RUN,
    )
  })
})

test.describe('changing the vault', () => {
  test('Settings → Change… switches to the chosen folder after confirming', async ({
    app,
    window,
    dirs,
  }) => {
    await window.getByTestId('rail-settings').click()
    await expect(window.getByTestId('settings-vault-path')).toHaveText(dirs.vault)

    const other = join(dirs.root, 'Other vault')
    await stubFolderPicker(app, other)

    // Cancelling keeps the current vault.
    await window.getByTestId('settings-vault-change').click()
    await window.getByTestId('vault-change-dialog-cancel').click()
    await expect(window.getByTestId('vault-change-dialog')).toHaveCount(0)
    await expect(window.getByTestId('settings-vault-path')).toHaveText(dirs.vault)
    expect(existsSync(other)).toBe(false)

    await window.getByTestId('settings-vault-change').click()
    await expect(window.getByTestId('vault-change-dialog')).toContainText(other)
    await window.getByTestId('vault-change-dialog-confirm').click()
    await expect(window.getByTestId('settings-vault-path')).toHaveText(other)
    expect(existsSync(join(other, 'sprawl.db'))).toBe(true)
    expect(JSON.parse(readFileSync(configFile(dirs), 'utf8')).vaultPath).toBe(other)
  })
})
