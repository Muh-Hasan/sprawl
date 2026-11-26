/**
 * E2E-only hooks (ARCHITECTURE §10.3), registered only with `SPRAWL_E2E=1`. They live on a
 * main-process global that Playwright reaches through `app.evaluate`, not on an IPC channel, so
 * nothing test-only is ever reachable from a renderer.
 */
export interface TestHooks {
  /** Fixes the injectable clock at `ms` (or lets it run again with null), then re-checks reminders. */
  setNow(ms: number | null): void
  /** The toasts that would have been shown, in order. */
  notifications(): { title: string; body: string; link: string; silent?: boolean }[]
  /** Opens the capture window as if the global shortcut was pressed. */
  triggerCapture(): void
  /** Routes a `sprawl://` link as if a toast was clicked. */
  openLink(url: string): void
  /** Runs one reminder check now. */
  checkReminders(): void
  /** What the tray would show (the tray itself is off in E2E). */
  trayState(): { shortcut: string | null; paused: boolean; overdue: number }
  /** True while the capture window is shown. */
  captureVisible(): boolean
}

declare global {
  var __sprawlTest: TestHooks | undefined
}

export function registerTestHooks(hooks: TestHooks): void {
  globalThis.__sprawlTest = hooks
}
