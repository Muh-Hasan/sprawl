/**
 * Everything that holds back writes (debounced saves, batched ops) registers a flush here.
 * When the window closes, main sends `app:before-close`; every flush sends what's pending, then
 * the renderer answers `app.readyToClose()`. IPC calls from one window reach main in order, so
 * the writes are handled before the close (ARCHITECTURE §6, "nothing is ever lost").
 */
const flushes = new Set<() => void>()

/** Registers a flush; returns the unregister function. */
export function registerFlush(fn: () => void): () => void {
  flushes.add(fn)
  return () => void flushes.delete(fn)
}

/** Sends every pending write now. A failing flush doesn't stop the others. */
export function flushAll(): void {
  for (const fn of flushes) {
    try {
      fn()
    } catch (err) {
      console.error('[flush] failed', err)
    }
  }
}

/** Answers main's close handshake. Call once at startup. */
export function handleBeforeClose(): () => void {
  return window.sprawl.on('app:before-close', () => {
    flushAll()
    void window.sprawl.app.readyToClose()
  })
}
