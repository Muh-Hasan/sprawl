import {
  IconLayoutDashboard,
  IconListCheck,
  IconNotebook,
  IconScribble,
  IconSearch,
  IconSettings,
  type TablerIcon,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import markLight from '@/assets/brand/sprawl-mark-light.svg'
import { NAV_SHORTCUTS, PALETTE_SHORTCUT, shortcutLabel } from '@/lib/shortcuts'
import { useClockStore } from '@/stores/clockStore'
import { useListStore } from '@/stores/listStore'
import { useUiStore, type View } from '@/stores/uiStore'
import { IconButton } from './IconButton'

interface NavItem {
  view: View
  label: string
  icon: TablerIcon
  shortcut?: string
}

const NAV: readonly NavItem[] = [
  {
    view: 'canvas',
    label: 'Canvas',
    icon: IconLayoutDashboard,
    shortcut: shortcutLabel(NAV_SHORTCUTS.canvas),
  },
  { view: 'list', label: 'List', icon: IconListCheck, shortcut: shortcutLabel(NAV_SHORTCUTS.list) },
  { view: 'log', label: 'Log', icon: IconNotebook, shortcut: shortcutLabel(NAV_SHORTCUTS.log) },
  {
    view: 'drawings',
    label: 'Drawings',
    icon: IconScribble,
    shortcut: shortcutLabel(NAV_SHORTCUTS.drawings),
  },
]

const SETTINGS_ITEM: NavItem = {
  view: 'settings',
  label: 'Settings',
  icon: IconSettings,
  shortcut: shortcutLabel(NAV_SHORTCUTS.settings),
}

/**
 * How many open notes are overdue, for the List badge. Asked again as the clock ticks, when notes
 * change, and when the panel closes or the view changes (an edited due date).
 */
function useOverdueCount(): number {
  const now = useClockStore((s) => s.now)
  const rev = useListStore((s) => s.rev)
  const view = useUiStore((s) => s.view)
  const openNoteId = useUiStore((s) => s.openNoteId)
  const [count, setCount] = useState(0)
  useEffect(() => {
    let live = true
    void window.sprawl.notes
      .overdueCount()
      .then((n) => live && setCount(n))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [now, rev, view, openNoteId])
  return count
}

/** The List icon's overdue count (UI_SPEC §2): a small pill, only when something is overdue. */
function OverdueBadge() {
  const count = useOverdueCount()
  if (count === 0) return null
  return (
    <span
      data-testid="rail-list-badge"
      aria-label={`${count} overdue`}
      className="pointer-events-none absolute top-0 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-due-overdue-bg px-1 text-2xs leading-none font-semibold text-due-overdue"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function RailButton({ item }: { item: NavItem }) {
  const active = useUiStore((s) => s.view === item.view)
  const setView = useUiStore((s) => s.setView)
  return (
    <div className="relative flex w-full justify-center">
      {active && (
        <span
          data-testid="rail-active-bar"
          className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-r-[1px] bg-foreground"
        />
      )}
      <IconButton
        data-testid={`rail-${item.view}`}
        icon={item.icon}
        label={item.label}
        shortcut={item.shortcut}
        tooltipSide="right"
        active={active}
        aria-current={active ? 'page' : undefined}
        className="size-9 rounded-lg [&_svg:not([class*='size-'])]:size-[18px]"
        onClick={() => setView(item.view)}
      />
      {item.view === 'list' && <OverdueBadge />}
    </div>
  )
}

/** The left rail (UI_SPEC §2): logo, the four views and Search, and Settings at the bottom. */
export function Rail() {
  return (
    <nav
      data-testid="rail"
      aria-label="Views"
      className="flex h-full w-[52px] shrink-0 flex-col items-center border-r border-border bg-surface pb-3"
    >
      <div className="h-11 w-full shrink-0 [-webkit-app-region:drag]" />
      <img src={markLight} alt="" aria-hidden className="mt-3 mb-4 size-[18px]" draggable={false} />
      <div className="flex w-full flex-col items-center gap-1">
        {NAV.map((item) => (
          <RailButton key={item.view} item={item} />
        ))}
        <div className="flex w-full justify-center">
          <IconButton
            data-testid="rail-search"
            icon={IconSearch}
            label="Search"
            shortcut={shortcutLabel(PALETTE_SHORTCUT)}
            tooltipSide="right"
            onClick={() => useUiStore.getState().setPaletteOpen(true)}
            className="size-9 rounded-lg [&_svg:not([class*='size-'])]:size-[18px]"
          />
        </div>
      </div>
      <div className="mt-auto w-full">
        <RailButton item={SETTINGS_ITEM} />
      </div>
    </nav>
  )
}
