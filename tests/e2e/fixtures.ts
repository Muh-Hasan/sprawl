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

export const MAIN_ENTRY = resolve(__dirname, '../../out/main/index.js')

export interface TestDirs {
  /** The temp folder holding both; anything else a test creates should go in here too. */
  root: string
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

/** The environment the app is launched with: this process's env plus the SPRAWL_ variables. */
export function appEnv(
  dirs: TestDirs,
  { useVault = true, env = {} }: LaunchOptions = {},
): Record<string, string> {
  const childEnv: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !key.startsWith('SPRAWL_')) childEnv[key] = value
  }
  // ELECTRON_RUN_AS_NODE would turn the app into a plain Node process.
  delete childEnv['ELECTRON_RUN_AS_NODE']
  return {
    ...childEnv,
    SPRAWL_E2E: '1',
    SPRAWL_USER_DATA: dirs.userData,
    ...(useVault ? { SPRAWL_VAULT: dirs.vault } : {}),
    ...env,
  }
}

/**
 * Launches the built app against the given temp dirs. Exported so specs can relaunch
 * the same vault (persistence tests) after closing the first instance.
 */
export async function launchApp(
  dirs: TestDirs,
  options: LaunchOptions = {},
): Promise<ElectronApplication> {
  return electron.launch({ args: [MAIN_ENTRY], env: appEnv(dirs, options) })
}

/**
 * Launches the app again on the same dirs (after the first instance closed), runs `fn`, and
 * always closes it, so a failed assertion can't leave SQLite files locked for the teardown.
 */
export async function relaunch(
  dirs: TestDirs,
  consoleProblems: string[],
  fn: (app: ElectronApplication, page: Page) => Promise<void>,
  options: LaunchOptions = {},
): Promise<void> {
  const app = await launchApp(dirs, options)
  try {
    const page = await app.firstWindow()
    watchConsole(page, consoleProblems)
    await page.waitForLoadState('domcontentloaded')
    await fn(app, page)
  } finally {
    await app.close()
  }
}

/**
 * The font families Chromium actually rendered the element's text with (DevTools' "Rendered
 * Fonts"), via the CDP. Proves a face is used, not just declared. Chromium reports the face's
 * full name, so a family comes back as e.g. "Outfit Thin" (the variable font's default
 * instance name; the weight axis still applies) or "Sora SemiBold". Returns the family part.
 */
export async function renderedFonts(page: Page, selector: string): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('DOM.enable')
    await cdp.send('CSS.enable')
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 })
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
    return fonts.map((f) => f.familyName.replace(/ (Thin|SemiBold|Regular)$/, ''))
  } finally {
    await cdp.detach()
  }
}

/** Makes the native folder picker answer `path` without showing a dialog. */
export async function stubFolderPicker(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, picked) => {
    Object.assign(dialog, {
      showOpenDialog: async () => ({ canceled: false, filePaths: [picked] }),
    })
  }, path)
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
    const dirs = { root, vault: join(root, 'vault'), userData: join(root, 'userData') }
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
