import { defineConfig } from '@playwright/test'

// ARCHITECTURE §10.3. The app is built by `npm run test:e2e` before Playwright starts.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  // Electron plus SQLite on Windows is more reliable serially.
  workers: 1,
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  // On GitHub Actions, failures are also shown as annotations on the pull request.
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: {
    trace: 'retain-on-failure',
  },
})
