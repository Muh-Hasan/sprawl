/**
 * Third-party console warnings/errors the E2E console check tolerates (ARCHITECTURE §10.3).
 * Only for libraries we don't control (BlockNote, Excalidraw, React dev notices).
 * Every entry needs a comment saying where it comes from and why it can't be fixed.
 */
export const KNOWN_WARNINGS: readonly RegExp[] = []
