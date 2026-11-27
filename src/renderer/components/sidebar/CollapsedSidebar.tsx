import { IconLayoutSidebar, IconPlus, IconSearch } from '@tabler/icons-react'
import { HintTooltip } from '@/components/HintTooltip'
import { IconButton } from '@/components/IconButton'
import { Button } from '@/components/ui/button'
import {
  CANVAS_SHORTCUTS,
  PALETTE_SHORTCUT,
  shortcutLabel,
  SIDEBAR_SHORTCUT,
} from '@/lib/shortcuts'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useUiStore } from '@/stores/uiStore'
import { newNote } from '@/views/search/commands'
import { OverdueBadge } from './OverdueBadge'
import { SETTINGS_ITEM, VIEW_ITEMS, type SidebarItem } from './sidebarItems'
import { useOverdueCount } from './useSidebarData'

/** 40px icon buttons with a 20px icon and a 10px radius. */
const RAIL_BUTTON = "size-10 rounded-[10px] [&_svg:not([class*='size-'])]:size-5"

function RailViewButton({ item }: { item: SidebarItem }) {
  const active = useUiStore((s) => s.view === item.view)
  const setView = useUiStore((s) => s.setView)
  return (
    <div className="relative">
      <IconButton
        data-testid={`sidebar-${item.view}`}
        icon={item.icon}
        label={item.label}
        shortcut={shortcutLabel(item.shortcut)}
        tooltipSide="right"
        active={active}
        aria-current={active ? 'page' : undefined}
        onClick={() => setView(item.view)}
        className={RAIL_BUTTON}
      />
      {item.view === 'list' && <ListBadge />}
    </div>
  )
}

function ListBadge() {
  return <OverdueBadge count={useOverdueCount()} compact />
}

/**
 * The collapsed sidebar (UI_SPEC §2): a 60px icon rail. Expand, New note, Search, the views and
 * Settings at the bottom, each with a tooltip naming it and its shortcut.
 */
export function CollapsedSidebar() {
  const toggle = useSidebarStore((s) => s.toggle)
  return (
    <aside
      data-testid="sidebar"
      data-collapsed="true"
      aria-label="Sidebar"
      className="flex h-full w-[60px] shrink-0 flex-col items-center border-r border-border bg-surface pb-2"
    >
      <div className="flex h-[52px] w-full shrink-0 items-center justify-center [-webkit-app-region:drag]">
        <IconButton
          data-testid="sidebar-toggle"
          icon={IconLayoutSidebar}
          label="Expand sidebar"
          shortcut={shortcutLabel(SIDEBAR_SHORTCUT)}
          tooltipSide="right"
          onClick={toggle}
          className={RAIL_BUTTON}
        />
      </div>
      <div className="flex flex-col items-center gap-1">
        <HintTooltip
          label="New note"
          shortcut={shortcutLabel(CANVAS_SHORTCUTS.newNote)}
          side="right"
        >
          <Button
            data-testid="sidebar-new-note"
            aria-label="New note"
            onClick={() => newNote()}
            className={`mb-1 ${RAIL_BUTTON}`}
          >
            <IconPlus stroke={2} />
          </Button>
        </HintTooltip>
        <IconButton
          data-testid="sidebar-search"
          icon={IconSearch}
          label="Search"
          shortcut={shortcutLabel(PALETTE_SHORTCUT)}
          tooltipSide="right"
          onClick={() => useUiStore.getState().setPaletteOpen(true)}
          className={RAIL_BUTTON}
        />
        <span aria-hidden className="my-1.5 h-px w-6 bg-border" />
        <nav aria-label="Views" className="flex flex-col items-center gap-1">
          {VIEW_ITEMS.map((item) => (
            <RailViewButton key={item.view} item={item} />
          ))}
        </nav>
      </div>
      <div className="mt-auto">
        <RailViewButton item={SETTINGS_ITEM} />
      </div>
    </aside>
  )
}
