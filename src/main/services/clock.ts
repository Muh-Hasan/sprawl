/**
 * The injectable clock (ARCHITECTURE §6, §10.3). Every service in main reads "now" through it,
 * so E2E tests can fix the time (`setNow`) and day, log and reminder behavior is deterministic.
 * Outside tests it's just `Date.now()`.
 */
export class Clock {
  private fixed: number | null = null

  now(): number {
    return this.fixed ?? Date.now()
  }

  /** Fixes the clock at `ms`, or lets it run again with null. */
  set(ms: number | null): void {
    this.fixed = ms
  }

  /** The fixed time, or null while the clock runs. */
  get fixedAt(): number | null {
    return this.fixed
  }
}
