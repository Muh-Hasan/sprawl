/**
 * E2E-only hooks (ARCHITECTURE §10.3), registered only with `SPRAWL_E2E=1`. They live on a
 * main-process global that Playwright reaches through `app.evaluate`, not on an IPC channel, so
 * nothing test-only is ever reachable from a renderer.
 */
export interface TestHooks {
  /** Fixes the injectable clock at `ms` (or lets it run again with null). */
  setNow(ms: number | null): void
}

declare global {
  var __sprawlTest: TestHooks | undefined
}

export function registerTestHooks(hooks: TestHooks): void {
  globalThis.__sprawlTest = hooks
}
