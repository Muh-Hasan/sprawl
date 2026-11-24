import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach } from 'vitest'

/** Returns a function that makes a temp dir, removed again after each test. */
export function useTempDirs(): () => string {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
    }
  })
  return () => {
    const dir = mkdtempSync(join(tmpdir(), 'sprawl-unit-'))
    dirs.push(dir)
    return dir
  }
}
