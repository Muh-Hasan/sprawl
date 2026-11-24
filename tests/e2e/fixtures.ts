import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  _electron as electron,
  expect,
  test as base,
  type ElectronApplication,
  type Page,
} from '@playwright/test'
import { KNOWN_WARNINGS } from './known-warnings'

const MAIN_ENTRY = resolve(__dirname, '../../out/main/index.js')

export interface TestDirs {
  /** The vault folder (SPRAWL_VAULT). */
  vault: string
  /** Electron's userData folder (SPRAWL_USER_DATA): config.json, single-instance lock. */
  userData: string
}

export interface LaunchOptions {
  /** Pass `false` to leave SPRAWL_VAULT unset, so onboarding runs (vault.spec.ts). */
  useVault?: boolean
  env?: Record<string, string>
}

/**
 * Launches the built app against the given temp dirs. Exported so specs can relaunch
 * the same vault (persistence tests) after closing the first instance.
 */
export async function launchApp(
  dirs: TestDirs,
  { useVault = true, env = {} }: LaunchOptions = {},
): Promise<ElectronApplication> {
  const childEnv: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !key.startsWith('SPRAWL_')) childEnv[key] = value
  }
  // ELECTRON_RUN_AS_NODE would turn the app into a plain Node process.
  delete childEnv['ELECTRON_RUN_AS_NODE']

  return electron.launch({
    args: [MAIN_ENTRY],
    env: {
      ...childEnv,
      SPRAWL_E2E: '1',
      SPRAWL_USER_DATA: dirs.userData,
      ...(useVault ? { SPRAWL_VAULT: dirs.vault } : {}),
      ...env,
    },
  })
}

/** Records console errors/warnings and uncaught page errors that aren't on the allow list. */
export function watchConsole(page: Page, problems: string[]): void {
  page.on('console', (msg) => {
    const type = msg.type()
    if (type !== 'error' && type !== 'warning') return
    const text = msg.text()
    if (KNOWN_WARNINGS.some((re) => re.test(text))) return
    problems.push(`[console.${type}] ${text}`)
  })
  page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`))
}

interface Fixtures {
  dirs: TestDirs
  appLaunch: LaunchOptions
  app: ElectronApplication
  window: Page
  consoleProblems: string[]
}

export const test = base.extend<Fixtures>({
  dirs: async ({}, use) => {
    const root = await mkdtemp(join(tmpdir(), 'sprawl-e2e-'))
    const dirs = { vault: join(root, 'vault'), userData: join(root, 'userData') }
    await use(dirs)
    // Windows can briefly keep SQLite files locked after the app exits.
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  },

  appLaunch: [{}, { option: true }],

  consoleProblems: async ({}, use) => {
    const problems: string[] = []
    await use(problems)
    expect(problems, 'console errors or warnings during the test').toEqual([])
  },

  app: async ({ dirs, appLaunch }, use) => {
    const app = await launchApp(dirs, appLaunch)
    await use(app)
    await app.close()
  },

  window: async ({ app, consoleProblems }, use) => {
    const page = await app.firstWindow()
    watchConsole(page, consoleProblems)
    await page.waitForLoadState('domcontentloaded')
    await use(page)
  },
})

export { expect }
