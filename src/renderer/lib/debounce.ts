export interface Debounced<A extends unknown[]> {
  (...args: A): void
  /** Runs the pending call now, if there is one. */
  flush(): void
  /** Drops the pending call. */
  cancel(): void
}

/** Calls `fn` once `ms` have passed without another call, with the latest arguments. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: A | null = null
  const run = (): void => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    const args = pending
    pending = null
    if (args) fn(...args)
  }
  const debounced = (...args: A): void => {
    pending = args
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(run, ms)
  }
  debounced.flush = run
  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    pending = null
  }
  return debounced
}
