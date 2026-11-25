/**
 * Cards made in this session that haven't been drawn yet, so they pop in (DESIGN_SYSTEM §6)
 * while cards that load, scroll back into view or come back with undo just appear.
 */
const fresh = new Set<string>()

export function markFresh(id: string): void {
  fresh.add(id)
}

/** True the first time a fresh card asks. */
export function takeFresh(id: string): boolean {
  return fresh.delete(id)
}
