import { create } from 'zustand'
import type { NoteColor } from '@shared/constants'
import { defaultSettings, type Settings } from '@shared/schemas'
import type { ListSort, ListTab } from '@shared/types'

type ListFilter = Settings['listFilter']

interface ListState {
  /** The tab, colors and sort, remembered in the `listFilter` setting. */
  filter: ListFilter
  /** The filter has been read from settings. */
  loaded: boolean
  /** The title filter (not remembered). */
  text: string
  /** Bumped whenever notes change, so the list and the overdue badge refetch. */
  rev: number
  load(): Promise<void>
  setTab(tab: ListTab): void
  toggleColor(color: NoteColor): void
  setSort(sort: ListSort): void
  setText(text: string): void
  changed(): void
}

/**
 * The List view's filter (PRODUCT §3.3) and a revision that anything changing notes bumps, so
 * the list and the rail's overdue badge stay current.
 */
export const useListStore = create<ListState>()((set, get) => {
  const save = (filter: ListFilter): void => {
    set({ filter })
    void window.sprawl.settings.set('listFilter', filter)
  }
  return {
    filter: defaultSettings().listFilter,
    loaded: false,
    text: '',
    rev: 0,
    load: async () => {
      if (get().loaded) return
      const filter = await window.sprawl.settings.get('listFilter')
      if (!get().loaded) set({ filter, loaded: true })
    },
    setTab: (tab) => {
      const apply = (): void => {
        if (get().filter.tab !== tab) save({ ...get().filter, tab })
      }
      // Picked before the saved filter loaded (the morning summary's Due tab): load it first,
      // so its colors and sort aren't lost.
      if (get().loaded) apply()
      else void get().load().then(apply)
    },
    toggleColor: (color) => {
      const { colors } = get().filter
      const next = colors.includes(color) ? colors.filter((c) => c !== color) : [...colors, color]
      save({ ...get().filter, colors: next })
    },
    setSort: (sort) => save({ ...get().filter, sort }),
    setText: (text) => set({ text }),
    changed: () => set((s) => ({ rev: s.rev + 1 })),
  }
})
