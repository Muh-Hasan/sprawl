/**
 * Process environment flags (ARCHITECTURE §10.3). Read once, in main, before `app` is ready.
 *
 * - `SPRAWL_USER_DATA`: overrides Electron's userData folder (isolates config.json and the
 *   single-instance lock, so tests never touch the real profile).
 * - `SPRAWL_VAULT`: use this vault and skip onboarding.
 * - `SPRAWL_E2E`: enables E2E mode (test-only IPC, recorded notifications, no tray).
 */
export interface Env {
  userData: string | null
  vault: string | null
  e2e: boolean
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const nonEmpty = (v: string | undefined): string | null => (v && v.trim() ? v : null)
  return {
    userData: nonEmpty(source.SPRAWL_USER_DATA),
    vault: nonEmpty(source.SPRAWL_VAULT),
    e2e: source.SPRAWL_E2E === '1',
  }
}

export const env = readEnv()
