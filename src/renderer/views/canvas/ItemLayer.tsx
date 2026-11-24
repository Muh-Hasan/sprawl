import { useEffect, useState } from 'react'
import type { CanvasItem } from '@shared/types'
import { canvasGrid, useCanvasStore } from '@/stores/canvasStore'
import { NoteCard } from './items/NoteCard'
import { useSimplified } from './useSimplified'
import { visibleWorldRect } from './Viewport'

/** Cards within this many screen px of the edge are rendered too, so panning never shows gaps. */
const CULL_MARGIN = 200

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

/** The ids of the cards near the viewport, sorted, recomputed only when that set changes. */
function useVisibleIds(): string[] {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    const compute = (): void => {
      const { viewport, size } = useCanvasStore.getState()
      const next = [...canvasGrid.query(visibleWorldRect(viewport, size, CULL_MARGIN))].sort()
      setIds((prev) => (sameIds(prev, next) ? prev : next))
    }
    compute()
    return useCanvasStore.subscribe((s, prev) => {
      if (s.viewport !== prev.viewport || s.size !== prev.size || s.items !== prev.items) compute()
    })
  }, [])
  return ids
}

function Card({ item, simplified }: { item: CanvasItem; simplified: boolean }) {
  switch (item.kind) {
    case 'note':
      return <NoteCard item={item} simplified={simplified} />
    default:
      // later: phase-7 link and image cards, phase-8 drawing cards.
      return null
  }
}

/** The cards in world coordinates, culled to the viewport (spatial buckets, ARCHITECTURE §6). */
export function ItemLayer() {
  const ids = useVisibleIds()
  const items = useCanvasStore((s) => s.items)
  const simplified = useSimplified()
  return ids.map((id) => {
    const item = items.get(id)
    return item ? <Card key={id} item={item} simplified={simplified} /> : null
  })
}
