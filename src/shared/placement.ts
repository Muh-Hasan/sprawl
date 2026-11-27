/**
 * Where a card that arrives without a drop point goes (a paste, a quick capture): FigJam-style,
 * each one lands 40px down and right of a card already sitting on the spot, so a burst of them
 * fans out with every title line showing instead of stacking into one pile.
 */

export interface Spot {
  x: number
  y: number
}

/**
 * The cascade step (a multiple of the 8px snap grid, and enough to clear a card's title line) and
 * how far it looks before giving up.
 */
export const CASCADE = { step: 40, tries: 64 } as const

/** A spot is taken when a card's top-left sits closer than this on both axes. */
const NEAR = CASCADE.step / 2

/**
 * The first free top-left on the diagonal from `start`: `start` itself if no card's top-left is
 * near it, else the next 40px step down and right, and so on. Past `CASCADE.tries` steps it
 * settles for the last one.
 */
export function cascadeSpot(start: Spot, taken: Iterable<Spot>): Spot {
  const corners = [...taken]
  let spot = start
  for (let i = 0; i < CASCADE.tries; i++) {
    spot = { x: start.x + i * CASCADE.step, y: start.y + i * CASCADE.step }
    const s = spot
    if (!corners.some((c) => Math.abs(c.x - s.x) < NEAR && Math.abs(c.y - s.y) < NEAR)) break
  }
  return spot
}
