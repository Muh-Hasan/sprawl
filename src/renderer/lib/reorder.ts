/**
 * Moves the item at `from` so it ends up at index `to` (as a drag-and-drop list does). Out of
 * range indexes leave the list as it is. Returns a new array.
 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}
